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
          include: { customer: { select: { name: true, company: true } } }
        },
      },
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", verifyToken, async (req, res) => {
  const { billing_id, invoice_number } = req.body;
  try {
    const invoice = await prisma.invoice.create({
      data: {
        billing_id: Number(billing_id),
        invoice_number,
        status: "Pending",
      },
    });
    res.status(201).json({ message: "Invoice generated!", invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/paid", verifyToken, async (req, res) => {
  try {
    await prisma.invoice.update({
      where: { id: Number(req.params.id) },
      data: { status: "Paid" },
    });
    res.json({ message: "Invoice marked as Paid!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
