const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { created_at: "desc" },
        });
        res.json(customers);
    } catch (err) {
        res.status(500).json({ message: "Error fetching customers" });
    }
});

router.post("/", verifyToken, async (req, res) => {
    const { name, company, email, phone, type } = req.body;
    try {
        const customer = await prisma.customer.create({
            data: { name, company, email, phone, type },
        });
        res.status(201).json({ message: "Customer added!", customer });
    } catch (err) {
        res.status(500).json({ message: "Error creating customer" });
    }
});

router.put("/:id", verifyToken, async (req, res) => {
    const { name, company, email, phone, type } = req.body;
    try {
        const customer = await prisma.customer.update({
            where: { id: Number(req.params.id) },
            data: { name, company, email, phone, type },
        });
        res.json({ message: "Customer updated!", customer });
    } catch (err) {
        res.status(500).json({ message: "Error updating customer" });
    }
});

router.delete("/:id", verifyToken, async (req, res) => {
    try {
        await prisma.customer.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Customer deleted!" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting customer" });
    }
});

module.exports = router;
