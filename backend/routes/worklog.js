const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");

// GET all work logs
router.get("/", verifyToken, async (req, res) => {
  try {
    const logs = await prisma.workLog.findMany({
      orderBy: { created_at: "desc" },
      include: {
        agent: { select: { full_name: true } },
        ticket: { select: { ticket_no: true, issue_title: true } },
      },
    });
    res.json(logs);
  } catch (err) {
    console.error("❌ WorkLog GET Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST create work log
router.post("/", verifyToken, async (req, res) => {
  const { ticket_id, start_time, end_time, time_spent, description } = req.body;

  if (!start_time || !end_time || !description) {
    return res.status(400).json({ message: "Start time, end time and description are required" });
  }

  try {
    const agentId = (req.user.role === "admin" && req.body.agent_id)
      ? Number(req.body.agent_id)
      : req.user.id;

    const log = await prisma.workLog.create({
      data: {
        ticket_id: ticket_id ? Number(ticket_id) : null,
        agent_id: agentId,
        start_time: String(start_time),
        end_time: String(end_time),
        time_spent: String(time_spent),
        description,
      },
    });

    // --- AMC Auto Deduction Logic ---
    if (ticket_id) {
      const ticket = await prisma.ticket.findUnique({ where: { id: Number(ticket_id) } });
      if (ticket && ticket.customer_name) {
        // Find customer by name
        const customer = await prisma.customer.findFirst({
          where: { name: ticket.customer_name }
        });

        // Check if customer exists and is an AMC customer
        if (customer && customer.type === "AMC") {
          // Find an active AMC contract
          const activeContract = await prisma.contractAMC.findFirst({
            where: {
              customer_id: customer.id,
              start_date: { lte: new Date() },
              end_date: { gte: new Date() }
            },
            orderBy: { created_at: "desc" }
          });

          if (activeContract) {
            // Parse time_spent string (e.g., "1h 30m" or "45m") to fractional hours
            let hoursLogged = 0;
            const hMatch = String(time_spent).match(/(\d+)h/);
            if (hMatch) hoursLogged += parseInt(hMatch[1], 10);

            const mMatch = String(time_spent).match(/(\d+)m/);
            if (mMatch) hoursLogged += parseInt(mMatch[1], 10) / 60;

            if (hoursLogged > 0) {
              await prisma.contractAMC.update({
                where: { id: activeContract.id },
                data: {
                  hours_used: activeContract.hours_used + hoursLogged
                }
              });
              console.log(`✅ Deducted ${hoursLogged.toFixed(2)} hours from AMC Contract ID ${activeContract.id}`);
            }
          }
        }
      }
    }
    // --------------------------------

    res.status(201).json({ message: "Work log saved!", log });
  } catch (err) {
    console.error("❌ WorkLog POST Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE work log
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await prisma.workLog.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: "Work log deleted!" });
  } catch (err) {
    console.error("❌ WorkLog DELETE Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
