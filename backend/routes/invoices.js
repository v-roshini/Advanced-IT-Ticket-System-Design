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

// Update standard status (Draft -> Sent, Overdue, Cancelled)
router.put("/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    await prisma.invoice.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json({ message: `Status explicitly updated to ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
