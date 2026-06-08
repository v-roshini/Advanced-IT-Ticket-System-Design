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

// Helper to get customer ID for a ticket
async function getCustomerIdForTicket(ticketId) {
  if (!ticketId) return null;
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(ticketId) },
    select: { customer_id: true }
  });
  return ticket?.customer_id;
}

// Robust helper to parse various time spent formats into decimal hours
function parseTimeSpentToHours(timeStr) {
  if (!timeStr) return 0;
  const s = String(timeStr).trim().toLowerCase();
  
  // Check for pure decimal number (e.g. "1.5" or "2")
  if (/^\d+(\.\d+)?$/.test(s)) {
    return parseFloat(s);
  }
  
  let totalHours = 0;
  
  // Match hours: "1.5h", "1h", "1.5 hours", "1.5 hr"
  const hMatch = s.match(/(\d+(\.\d+)?)\s*(h|hour|hr)/);
  if (hMatch) {
    totalHours += parseFloat(hMatch[1]);
  }
  
  // Match minutes: "30m", "30 mins", "30 minutes"
  const mMatch = s.match(/(\d+)\s*(m|min)/);
  if (mMatch) {
    totalHours += parseInt(mMatch[1], 10) / 60;
  }
  
  // Fallback: minutes words
  if (!hMatch && !mMatch) {
    const fallbackMin = s.match(/(\d+)\s*minutes?/);
    if (fallbackMin) {
      totalHours += parseInt(fallbackMin[1], 10) / 60;
    }
  }
  
  return totalHours;
}

// Helper to recalculate hours used for all AMC contracts of a customer
async function recalculateAMCHoursForCustomer(customerId) {
  if (!customerId) return;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) return;

    // Find all AMC contracts for this customer
    const contracts = await prisma.contractAMC.findMany({
      where: { customer_id: customer.id }
    });

    for (const contract of contracts) {
      // Fetch all UNBILLED work logs for this customer within the contract's date range
      const logs = await prisma.workLog.findMany({
        where: {
          ticket: { customer_id: customer.id },
          is_billed: false,
          created_at: {
            gte: contract.start_date,
            lte: contract.end_date
          }
        }
      });

      let totalCalculatedHours = 0;
      logs.forEach(l => {
        totalCalculatedHours += parseTimeSpentToHours(l.time_spent);
      });

      const previousHoursUsed = contract.hours_used;
      const newHoursUsed = Number(totalCalculatedHours.toFixed(2));

      // Update the contract
      await prisma.contractAMC.update({
        where: { id: contract.id },
        data: { hours_used: newHoursUsed }
      });

      // 🔔 Overage Alerts (80% and 100%)
      const limit = contract.monthly_hours;
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
    }
  } catch (err) {
    console.error("❌ Error recalculating AMC hours:", err.message);
  }
}

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
      const customerId = await getCustomerIdForTicket(ticket_id);
      if (customerId) {
        await recalculateAMCHoursForCustomer(customerId);
      }
    }

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

    const originalCustomerId = log.ticket_id ? await getCustomerIdForTicket(log.ticket_id) : null;

    const updated = await prisma.workLog.update({
      where: { id: Number(id) },
      data: { description, start_time, end_time, time_spent }
    });

    const newCustomerId = updated.ticket_id ? await getCustomerIdForTicket(updated.ticket_id) : null;

    if (originalCustomerId) {
      await recalculateAMCHoursForCustomer(originalCustomerId);
    }
    if (newCustomerId && newCustomerId !== originalCustomerId) {
      await recalculateAMCHoursForCustomer(newCustomerId);
    }

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

    const customerId = log.ticket_id ? await getCustomerIdForTicket(log.ticket_id) : null;

    await prisma.workLog.delete({
      where: { id: Number(req.params.id) },
    });

    if (customerId) {
      await recalculateAMCHoursForCustomer(customerId);
    }

    res.json({ message: "Work log deleted!" });
  } catch (err) {
    console.error("❌ WorkLog DELETE Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

router.parseTimeSpentToHours = parseTimeSpentToHours;
module.exports = router;
