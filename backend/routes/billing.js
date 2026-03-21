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

router.get("/", verifyToken, async (req, res) => {
  try {
    let whereClause = {};
    if (req.user.role === 'client') {
        const canView = await prisma.permission.findFirst({
            where: { role: 'client', permission_key: 'can_view_billing', is_enabled: true }
        });
        if (!canView) return res.status(403).json({ message: "Permission Denied: You cannot view billing history." });

        const custId = await getCustomerId(req.user.id);
        if (!custId) return res.status(403).json({ message: "Customer profile not found" });
        whereClause.customer_id = custId;
    }

    if (req.user.role === 'agent') {
        const canView = await prisma.permission.findFirst({
            where: { role: 'agent', permission_key: 'can_view_billing', is_enabled: true }
        });
        if (!canView) return res.status(403).json({ message: "Permission Denied: You cannot view billing records." });
    }

    const bills = await prisma.billing.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      include: {
        customer: { select: { name: true, company: true } },
        invoices: true,
      },
    });
    res.json(bills);
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
  const { customer_id, hours_used, hourly_rate, total_amount, month, log_ids } = req.body;
  try {
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

    if (log_ids && log_ids.length > 0) {
      // Fetch logs for line item details
      const logs = await prisma.workLog.findMany({
        where: { id: { in: log_ids.map(id => Number(id)) } },
        include: { ticket: true, agent: true }
      });

      // Create Line Items
      if (logs.length > 0) {
        await prisma.invoiceLineItem.createMany({
          data: logs.map(l => ({
            invoice_id: invoice.id,
            ticket_ref: l.ticket?.ticket_no || "General",
            agent_name: l.agent?.full_name || "Unknown",
            date_logged: l.created_at,
            hours: 1, // Default to 1 if parsing fails
            rate: Number(hourly_rate),
            total: Number(hourly_rate)
          }))
        });
      }

      await prisma.workLog.updateMany({
        where: { id: { in: log_ids.map(id => Number(id)) } },
        data: { is_billed: true, billing_id: bill.id }
      });
    }

    res.status(201).json({ message: "Bill and Itemized Invoice created!", bill, invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
