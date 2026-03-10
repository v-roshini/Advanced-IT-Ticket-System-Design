const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, async (req, res) => {
  try {
    const bills = await prisma.billing.findMany({
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

router.post("/", verifyToken, async (req, res) => {
  const { customer_id, hours_used, hourly_rate, total_amount, month } = req.body;
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
    res.status(201).json({ message: "Bill created!", bill });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
