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
            const timeStr = String(time_spent);
            const hMatch = timeStr.match(/(\d+)h/);
            if (hMatch) hoursLogged += parseInt(hMatch[1], 10);
            const mMatch = timeStr.match(/(\d+)m/);
            if (mMatch) hoursLogged += parseInt(mMatch[1], 10) / 60;

            if (hoursLogged > 0) {
              const newHoursUsed = activeContract.hours_used + hoursLogged;
              
              await prisma.contractAMC.update({
                where: { id: activeContract.id },
                data: { hours_used: newHoursUsed }
              });
              
              console.log(`✅ Deducted ${hoursLogged.toFixed(2)} hours from AMC Contract ID ${activeContract.id}`);

              // P1: Generate extra hours billing if exceeded
              const previousOverage = Math.max(0, activeContract.hours_used - activeContract.monthly_hours);
              const newOverage = Math.max(0, newHoursUsed - activeContract.monthly_hours);
              const billableOverage = newOverage - previousOverage;

              if (billableOverage > 0 && activeContract.extra_hour_rate > 0) {
                const amount = billableOverage * activeContract.extra_hour_rate;
                const monthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
                
                // Add to billing table automatically
                await prisma.billing.create({
                  data: {
                    customer_id: customer.id,
                    hours_used: billableOverage,
                    hourly_rate: activeContract.extra_hour_rate,
                    total_amount: amount,
                    month: monthStr
                  }
                });
                console.log(`⚠️ Overage billed: ${billableOverage.toFixed(2)} hrs at ₹${activeContract.extra_hour_rate} (Total: ₹${amount.toFixed(2)})`);
              }
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

// PUT (Edit) work log
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { description, start_time, end_time, time_spent } = req.body;

  try {
    const log = await prisma.workLog.findUnique({ where: { id: Number(id) } });
    if (!log) return res.status(404).json({ message: "Work log not found" });

    // P2: Restriction - Must be own log OR admin. AND < 24 hours old.
    const isOwner = log.agent_id === req.user.id;
    const hoursOld = (new Date() - new Date(log.created_at)) / (1000 * 60 * 60);

    if (req.user.role !== "admin") {
      if (!isOwner) return res.status(403).json({ message: "Not authorized" });
      if (hoursOld > 24) return res.status(403).json({ message: "Editing locked after 24 hours" });
    }

    const updated = await prisma.workLog.update({
      where: { id: Number(id) },
      data: { description, start_time, end_time, time_spent }
    });
    res.json({ message: "Work log updated!", updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE work log
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const log = await prisma.workLog.findUnique({ where: { id: Number(req.params.id) } });
    if (!log) return res.status(404).json({ message: "Work log not found" });

    const isOwner = log.agent_id === req.user.id;
    const hoursOld = (new Date() - new Date(log.created_at)) / (1000 * 60 * 60);

    if (req.user.role !== "admin") {
       if (!isOwner) return res.status(403).json({ message: "Not authorized" });
       if (hoursOld > 24) return res.status(403).json({ message: "Cannot delete logs older than 24h" });
    }

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
