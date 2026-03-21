const prisma = require("../config/prisma");
const nodeCron = require("node-cron");
const { sendNotification, notifyAdmins } = require("./notificationService");

/**
 * SLA Monitoring Engine Logic
 * This function scans all active tickets and updates their SLA status.
 */
async function processSLAEngine() {
  console.log("⏱️ Starting SLA Engine Scan...");

  try {
    const activeTickets = await prisma.ticket.findMany({
      where: {
        status: { notIn: ["Resolved", "Closed"] },
        sla_paused_at: null, // Only process tickets that are NOT paused
      },
    });

    const now = new Date();

    for (const ticket of activeTickets) {
      const createdAt = new Date(ticket.created_at);
      let targetDeadline = ticket.sla_resolution_deadline || ticket.sla_response_deadline;
      
      if (!targetDeadline) continue;

      const totalSlaTimeMs = new Date(targetDeadline).getTime() - createdAt.getTime();
      const elapsedSlaTimeMs = now.getTime() - createdAt.getTime() - (ticket.total_paused_mins * 60000 || 0);
      
      const elapsedPercentage = (elapsedSlaTimeMs / totalSlaTimeMs) * 100;

      let newSlaStatus = ticket.sla_status;

      if (elapsedPercentage >= 100) {
        newSlaStatus = "breached";
      } else if (elapsedPercentage >= 75) {
        newSlaStatus = "at_risk";
      } else {
        newSlaStatus = "on_track";
      }

      if (newSlaStatus !== ticket.sla_status) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { sla_status: newSlaStatus },
        });

        // Log the breach/risk in audit logs
        await prisma.ticketAuditLog.create({
          data: {
            ticket_id: ticket.id,
            action: "SLA Warning",
            details: `SLA Status changed to ${newSlaStatus.toUpperCase()} (${Math.round(elapsedPercentage)}% elapsed)`,
          }
        });

        // ✅ NEW: Trigger Notifications
        if (newSlaStatus === "breached") {
          // Notify Agent
          if (ticket.agent_id) {
            await sendNotification(
              ticket.agent_id,
              "sla_breach",
              "🚨 SLA BREACHED",
              `Ticket ${ticket.ticket_no} has breached its deadline!`,
              `/tickets/${ticket.id}`
            );
          }
          // Notify Admin
          await notifyAdmins(
            "sla_breach",
            "🚨 CRITICAL: SLA Breached",
            `Ticket ${ticket.ticket_no} for ${ticket.customer_name} has breached SLA.`,
            `/tickets/${ticket.id}`
          );
        } else if (newSlaStatus === "at_risk") {
          // Notify Agent
          if (ticket.agent_id) {
            await sendNotification(
              ticket.agent_id,
              "sla_risk",
              "⚠️ SLA AT RISK",
              `Ticket ${ticket.ticket_no} is 75% through its SLA!`,
              `/tickets/${ticket.id}`
            );
          }
        }

        console.log(`⚠️ SLA Status updated for Ticket ${ticket.ticket_no}: ${newSlaStatus}`);
      }
    }

    console.log("🏁 SLA Engine Scan Complete.");
  } catch (err) {
    console.error("❌ SLA Engine Error:", err);
  }
}

/**
 * Setup CRON job: Runs every minute
 */
function startSLACron() {
  nodeCron.schedule("* * * * *", () => {
    processSLAEngine();
  });
  console.log("🕒 SLA Monitoring Engine scheduled every 1 minute.");
  
  // Run once at startup
  processSLAEngine();
}

module.exports = {
  processSLAEngine,
  startSLACron,
};
