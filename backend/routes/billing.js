const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// Helper to get customer ID for a portal user
async function getCustomerId(userId) {
    const customer = await prisma.customer.findUnique({
        where: { portal_user_id: userId }
    });
    return customer?.id;
}

router.get("/", verifyToken, checkPermission('can_view_billing'), async (req, res) => {
  try {
    let whereClause = {};
    
    // Admins and Finance (if permitted) see everything. 
    // Agents & Clients only see what's allowed.
    if (req.user.role === 'client') {
        const custId = await getCustomerId(req.user.id);
        if (!custId) return res.status(403).json({ message: "Customer profile not found" });
        whereClause.customer_id = custId;
    }

    const bills = await prisma.billing.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      include: {
        customer: { select: { name: true, company: true } },
        invoices: {
          include: { line_items: true }
        },
      },
    });

    // Self-healing: auto-create missing invoices for any billing records
    const healedBills = [];
    for (const bill of bills) {
      if (!bill.invoices || bill.invoices.length === 0) {
        const invoiceNumber = "INV-HEAL-" + Math.floor(100000 + Math.random() * 900000);
        const gstPercent = 5;
        const subtotal = bill.total_amount || 0;
        const totalTax = subtotal * (gstPercent / 100);
        const totalWithTax = subtotal + totalTax;

        const invoice = await prisma.invoice.create({
          data: {
            billing_id: bill.id,
            invoice_number: invoiceNumber,
            status: "Draft",
            gst_percentage: gstPercent,
            total_tax: totalTax,
            total_amout_with_tax: totalWithTax,
            due_date: new Date(new Date().setDate(new Date().getDate() + 15))
          },
          include: {
            line_items: true
          }
        });
        
        // Create a default line item for the healed invoice so it displays correctly
        await prisma.invoiceLineItem.create({
          data: {
            invoice_id: invoice.id,
            ticket_ref: "Support Retainer / Overage Service",
            agent_name: "System",
            date_logged: new Date(),
            hours: bill.hours_used || 1,
            rate: bill.hourly_rate || 0,
            total: subtotal
          }
        });

        // Refetch the invoice to include line items
        const completeInvoice = await prisma.invoice.findUnique({
          where: { id: invoice.id },
          include: { line_items: true }
        });

        healedBills.push({ ...bill, invoices: [completeInvoice] });
      } else {
        healedBills.push(bill);
      }
    }

    res.json(healedBills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/unbilled/:customerId", verifyToken, async (req, res) => {
  try {
    const logs = await prisma.workLog.findMany({
      where: {
        ticket: { customer_id: Number(req.params.customerId) },
        is_billed: false,
      },
      include: { ticket: true, agent: true }
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", verifyToken, checkPermission('can_generate_invoice'), async (req, res) => {
  const { 
    customer_id, 
    hours_used, 
    hourly_rate, 
    total_amount, 
    month, 
    log_ids, 
    billing_type, 
    base_amount, 
    overage_amount, 
    overage_hours, 
    gst_percentage 
  } = req.body;

  try {
    const isAMC = billing_type === "amc";

    const bill = await prisma.billing.create({
      data: {
        customer_id:  Number(customer_id),
        hours_used:   Number(hours_used),
        hourly_rate:  Number(hourly_rate),
        total_amount: Number(total_amount),
        month,
      },
    });

    // ✅ P1: Auto-generate Itemized Invoice
    const invoiceNumber = "INV-" + Date.now().toString().slice(-6);
    const invoice = await prisma.invoice.create({
        data: {
            billing_id: bill.id,
            invoice_number: invoiceNumber,
            status: "Draft",
            due_date: new Date(new Date().setDate(new Date().getDate() + 15)), // 15 days due
        }
    });

    if (isAMC) {
      const amcLineItems = [];
      const baseFeeVal = Number(base_amount) || 0;
      const overageVal = Number(overage_amount) || 0;
      const overageHrs = Number(overage_hours) || 0;

      if (baseFeeVal > 0) {
        amcLineItems.push({
          invoice_id: invoice.id,
          ticket_ref: "AMC Monthly Retainer Fee",
          agent_name: "System",
          date_logged: new Date(),
          hours: 1,
          rate: baseFeeVal,
          total: baseFeeVal
        });
      }

      if (overageVal > 0) {
        amcLineItems.push({
          invoice_id: invoice.id,
          ticket_ref: `AMC Support Overage (${overageHrs} hrs)`,
          agent_name: "System",
          date_logged: new Date(),
          hours: overageHrs,
          rate: Number(hourly_rate) || 0,
          total: overageVal
        });
      }

      if (amcLineItems.length > 0) {
        await prisma.invoiceLineItem.createMany({
          data: amcLineItems
        });
      }

      if (log_ids && log_ids.length > 0) {
        await prisma.workLog.updateMany({
          where: { id: { in: log_ids.map(id => Number(id)) } },
          data: { is_billed: true, billing_id: bill.id }
        });
      }

      const gstPercent = gst_percentage !== undefined ? Number(gst_percentage) : 5;
      const subtotal = baseFeeVal + overageVal;
      const totalTax = subtotal * (gstPercent / 100);
      const totalWithTax = subtotal + totalTax;

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          gst_percentage: gstPercent,
          total_tax: totalTax,
          total_amout_with_tax: totalWithTax
        }
      });
    } else {
      if (log_ids && log_ids.length > 0) {
        // Fetch logs for line item details
        const logs = await prisma.workLog.findMany({
          where: { id: { in: log_ids.map(id => Number(id)) } },
          include: { ticket: true, agent: true }
        });

        // Create Line Items
        if (logs.length > 0) {
          let subtotal = 0;
          const lineItems = logs.map(l => {
            // 💡 Parsing 'time_spent' string (e.g. '1h 30m' or '45m') into decimal hours
            let hoursLogged = 0;
            const timeStr = String(l.time_spent || "0h");
            const hMatch = timeStr.match(/(\d+)h/);
            if (hMatch) hoursLogged += parseInt(hMatch[1], 10);
            const mMatch = timeStr.match(/(\d+)m/);
            if (mMatch) hoursLogged += parseInt(mMatch[1], 10) / 60;

            // Default to 1 if no recognizable time found
            if (hoursLogged === 0) hoursLogged = 1;

            const lineTotal = hoursLogged * Number(hourly_rate);
            subtotal += lineTotal;

            return {
              invoice_id: invoice.id,
              ticket_ref: l.ticket?.ticket_no || "General",
              agent_name: l.agent?.full_name || "Unknown",
              date_logged: l.created_at,
              hours: hoursLogged,
              rate: Number(hourly_rate),
              total: lineTotal
            };
          });

          await prisma.invoiceLineItem.createMany({
            data: lineItems
          });

          // ✅ P1: Calculate Tax and Update Invoice Total
          const gstPercent = gst_percentage !== undefined ? Number(gst_percentage) : 18;
          const totalTax = subtotal * (gstPercent / 100);
          const totalWithTax = subtotal + totalTax;

          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              gst_percentage: gstPercent,
              total_tax: totalTax,
              total_amout_with_tax: totalWithTax
            }
          });
        }

        await prisma.workLog.updateMany({
          where: { id: { in: log_ids.map(id => Number(id)) } },
          data: { is_billed: true, billing_id: bill.id }
        });
      }
    }

    res.status(201).json({ message: "Bill and Itemized Invoice created!", bill, invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
