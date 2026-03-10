const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, async (req, res) => {
    try {
        const agents = await prisma.user.findMany({
            where: { role: "agent" },
            select: { id: true, full_name: true, email: true, phone: true, role: true },
        });
        res.json(agents);
    } catch (err) {
        res.status(500).json({ message: "Error fetching agents" });
    }
});

module.exports = router;
