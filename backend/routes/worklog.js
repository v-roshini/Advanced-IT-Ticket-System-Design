const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

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

const { sendNotification, notifyAdmins } = require("../services/notificationService");

// POST create work log
router.post("/", verifyToken, checkPermission('can_add_work_log'), async (req, res) => {
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
      if (ticket && ticket.customer_id) {
        // Find customer and their active AMC contract
        const customer = await prisma.customer.findUnique({
          where: { id: ticket.customer_id }
        });

        if (customer && customer.type === "AMC") {
          const activeContract = await prisma.contractAMC.findFirst({
            where: {
              customer_id: customer.id,
              start_date: { lte: new Date() },
              end_date: { gte: new Date() }
            },
            orderBy: { created_at: "desc" }
          });

          if (activeContract) {
            // Parse time_spent string to fractional hours
            let hoursLogged = 0;
            const timeStr = String(time_spent);
            const hMatch = timeStr.match(/(\d+)h/);
            if (hMatch) hoursLogged += parseInt(hMatch[1], 10);
            const mMatch = timeStr.match(/(\d+)m/);
            if (mMatch) hoursLogged += parseInt(mMatch[1], 10) / 60;

            if (hoursLogged > 0) {
              const previousHoursUsed = activeContract.hours_used;
              const newHoursUsed = previousHoursUsed + hoursLogged;
              
              const updatedContract = await prisma.contractAMC.update({
                where: { id: activeContract.id },
                data: { hours_used: newHoursUsed }
              });
              
              // 🔔 Overage Alerts (80% and 100%)
              const limit = activeContract.monthly_hours;
              const prevPercent = (previousHoursUsed / limit) * 100;
              const newPercent = (newHoursUsed / limit) * 100;

              if (newPercent >= 100 && prevPercent < 100) {
                const msg = `Customer ${customer.name} has exceeded their AMC monthly hours (${limit}h).`;
                await notifyAdmins("amc_limit", "🚨 AMC LIMIT REACHED", msg, `/amc`);
                if (customer.portal_user_id) {
                  await sendNotification(customer.portal_user_id, "amc_limit", "⚖️ Service Limit Reached", "You have utilized 100% of your monthly AMC hours. Further work will be billed at extra rates.", `/amc`);
                }
              } else if (newPercent >= 80 && prevPercent < 80) {
                const msg = `Customer ${customer.name} has utilized 80% of their AMC monthly hours.`;
                await notifyAdmins("amc_warning", "⚠️ AMC Usage Warning", msg, `/amc`);
                if (customer.portal_user_id) {
                  await sendNotification(customer.portal_user_id, "amc_warning", "⚖️ Service Usage Alert", "You have utilized 80% of your monthly AMC hours.", `/amc`);
                }
              }

              // P1: Generate extra hours billing if exceeded
              const previousOverage = Math.max(0, previousHoursUsed - limit);
              const newOverage = Math.max(0, newHoursUsed - limit);
              const billableOverage = newOverage - previousOverage;

              if (billableOverage > 0 && activeContract.extra_hour_rate > 0) {
                const amount = billableOverage * activeContract.extra_hour_rate;
                const monthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
                
                await prisma.billing.create({
                  data: {
                    customer_id: customer.id,
                    hours_used: billableOverage,
                    hourly_rate: activeContract.extra_hour_rate,
                    total_amount: amount,
                    month: monthStr
                  }
                });
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
