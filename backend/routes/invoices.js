const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { created_at: "desc" },
      include: {
        billing: {
          include: { customer: { select: { name: true, company: true, address: true } } }
        },
        line_items: true,
        payments: true
      },
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  const { billing_id, invoice_number, gst_percentage } = req.body;
  
  try {
    // 1. Fetch matching billing records to calculate total and prep line items
    const billing = await prisma.billing.findUnique({ 
      where: { id: Number(billing_id) },
      include: { work_logs: { include: { ticket: true } } } 
    });
    if (!billing) return res.status(404).json({ message: "Billing record not found" });

    const totalRaw = Number(billing.total_amount) || 0;
    const taxPerc = Number(gst_percentage) || 0;
    const taxAmount = (totalRaw * taxPerc) / 100;
    const totalWithTax = totalRaw + taxAmount;
    
    // We establish due date 14 days out
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // Prepare Line Items: If work_logs exist, map them. Otherwise, use a general line.
    const mappedLineItems = billing.work_logs.length > 0 
      ? billing.work_logs.map(log => {
          let hrsVal = 0;
          const timeStr = String(log.time_spent);
          const hMatch = timeStr.match(/(\d+)h/);
          if (hMatch) hrsVal += parseInt(hMatch[1], 10);
          const mMatch = timeStr.match(/(\d+)m/);
          if (mMatch) hrsVal += parseInt(mMatch[1], 10) / 60;

          return {
            ticket_ref: log.ticket?.ticket_no || "General Support",
            hours: hrsVal || 1,
            rate: Number(billing.hourly_rate) || 0,
            total: (hrsVal || 1) * (Number(billing.hourly_rate) || 0),
            date_logged: log.created_at
          };
        })
      : [{
          ticket_ref: "AMC/General Hourly",
          hours: Number(billing.hours_used) || 0,
          rate: Number(billing.hourly_rate) || 0,
          total: totalRaw
        }];

    const invoice = await prisma.invoice.create({
      data: {
        billing_id: Number(billing_id),
        invoice_number: invoice_number || `INV-${new Date().getTime()}`,
        status: "Draft",
        gst_percentage: taxPerc,
        total_tax: taxAmount,
        total_amout_with_tax: totalWithTax,
        due_date: dueDate,
        line_items: {
           create: mappedLineItems
        }
      },
      include: { line_items: true }
    });
    res.status(201).json({ message: "Invoice generated natively!", invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/paid", verifyToken, async (req, res) => {
  try {
    const { amount, method, notes } = req.body;
    const invoiceId = Number(req.params.id);

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "Paid" },
    });

    if (amount && method) {
      await prisma.payment.create({
        data: {
          invoice_id: invoiceId,
          amount: Number(amount),
          payment_method: method,
          notes: notes || ""
        }
      });
    }

    res.json({ message: "Invoice marked as Paid & Payment saved!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const { generatePDFBuffer } = require("../services/pdfService");

// Download Invoice as PDF
router.get("/:id/download", verifyToken, async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        billing: {
          include: { customer: true }
        },
        line_items: true
      }
    });

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // Prepare data for EJS template
    const pdfData = {
      invoice_no: invoice.invoice_number,
      created_at: invoice.created_at,
      customer_name: invoice.billing?.customer?.name || "Customer",
      company_name: invoice.billing?.customer?.company || "N/A",
      customer_email: invoice.billing?.customer?.email || "N/A",
      items: invoice.line_items.map(li => ({
        description: li.ticket_ref || "Service",
        quantity: li.hours || 1,
        unit_price: li.rate || 0,
        amount: li.total || 0
      })),
      subtotal: invoice.total_amout_with_tax - invoice.total_tax,
      tax_percentage: invoice.gst_percentage,
      tax_amount: invoice.total_tax,
      total_amount: invoice.total_amout_with_tax
    };

    const pdfBuffer = await generatePDFBuffer("invoice", pdfData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice-${invoice.invoice_number}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ PDF Route Error:", err.message);
    res.status(500).json({ message: "Failed to generate PDF invoice" });
  }
});

module.exports = router;

