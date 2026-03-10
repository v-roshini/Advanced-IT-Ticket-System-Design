const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all tickets
router.get("/", verifyToken, async (req, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            orderBy: { created_at: "desc" },
            include: { agent: { select: { full_name: true } } },
        });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: "Error fetching tickets" });
    }
});

// GET single ticket
router.get("/:id", verifyToken, async (req, res) => {
    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                agent: { select: { full_name: true } },
                comments: { include: { user: { select: { full_name: true } } } },
                work_logs: true,
            },
        });
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });
        res.json(ticket);
    } catch (err) {
        res.status(500).json({ message: "Error fetching ticket" });
    }
});

// CREATE ticket
router.post("/", verifyToken, async (req, res) => {
    const { customer_name, company, issue_title, description, priority, category, project } = req.body;
    const ticket_no = "TKT" + Date.now().toString().slice(-6);

    try {
        const ticket = await prisma.ticket.create({
            data: {
                ticket_no,
                customer_name,
                company,
                issue_title,
                description,
                priority,
                category,
                project,
            },
        });
        res.status(201).json({ message: "Ticket created!", ticket });
    } catch (err) {
        res.status(500).json({ message: "Error creating ticket" });
    }
});

// UPDATE ticket
router.put("/:id", verifyToken, async (req, res) => {
    const { status, agent_id } = req.body;

    // Only admins can assign/change the agent on a ticket
    if (agent_id !== undefined && req.user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can assign agents to tickets." });
    }

    // Only admins and agents can update ticket status
    if (status !== undefined && req.user.role === "client") {
        return res.status(403).json({ message: "Customers cannot update ticket status." });
    }

    try {
        const updateData = { status };

        // Only include agent_id in the update if the user is an admin
        if (req.user.role === "admin") {
            updateData.agent_id = agent_id ? Number(agent_id) : null;
        }

        const ticket = await prisma.ticket.update({
            where: { id: Number(req.params.id) },
            data: updateData,
        });
        res.json({ message: "Ticket updated!", ticket });
    } catch (err) {
        res.status(500).json({ message: "Error updating ticket" });
    }
});

// DELETE ticket
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        await prisma.ticket.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Ticket deleted!" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting ticket" });
    }
});

module.exports = router;
