const prisma = require("../config/prisma");
const nodeCron = require("node-cron");
const { sendNotification, notifyAdmins } = require("./notificationService");

/**
 * Renewal Alert Engine Logic
 * This function processes status transitions and creates alerts/tickets as requested.
 */
async function processRenewalAlerts() {
  console.log("⏱️ Starting Renewal Alert Engine Scan...");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const renewals = await prisma.renewal.findMany({
      where: {
        status: { notIn: ["renewed"] }, // only process active, expiring, expired
      },
      include: {
        customer: true,
      },
    });

    for (const r of renewals) {
      const expDate = new Date(r.expiry_date);
      expDate.setHours(0, 0, 0, 0);

      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let newStatus = r.status;

      // Status Updates
      if (diffDays <= 0 && r.status !== "expired") {
        newStatus = "expired";
      } else if (diffDays <= 30 && diffDays > 0 && r.status !== "expiring_soon") {
        newStatus = "expiring_soon";
      } else if (diffDays > 30 && r.status === "expiring_soon") {
        newStatus = "active"; // handle cases where users update the date but not status
      }

      if (newStatus !== r.status) {
        await prisma.renewal.update({
          where: { id: r.id },
          data: { status: newStatus },
        });
        console.log(`✅ Status updated for ${r.asset_name}: ${r.status} → ${newStatus}`);
      }

      // Auto-Ticket Creation (if 3 days overdue)
      if (diffDays <= -3) {
        // Only create one ticket per asset
        const existingTicket = await prisma.ticket.findFirst({
          where: {
            issue_title: `URGENT: ${r.asset_name} renewal overdue for ${r.customer?.name}`,
            status: { not: "Closed" },
          },
        });

        if (!existingTicket) {
          const ticketNo = `R-${Date.now().toString().slice(-6)}`;
          await prisma.ticket.create({
            data: {
              ticket_no: ticketNo,
              customer_id: r.customer_id,
              customer_name: r.customer?.name,
              company: r.customer?.company,
              issue_title: `URGENT: ${r.asset_name} renewal overdue for ${r.customer?.name}`,
              description: `System generated alert: The ${r.category.toUpperCase()} asset '${r.asset_name}' for customer ${r.customer?.name} has been expired for ${Math.abs(diffDays)} days.\n\nExpiry Date: ${r.expiry_date.toLocaleDateString()}\nCost: ${r.cost || 0} ${r.currency}`,
              priority: "Critical",
              category: "General Support",
              status: "Open",
              source: "System Alert",
            },
          });
          console.log(`🚨 Auto-ticket created for overdue asset: ${r.asset_name}`);
        }
      }

      // Alert Notification Logic (60, 30, 15, 7, 3, 1 days)
      const alertDays = [60, 30, 15, 7, 3, 1];
      if (alertDays.includes(diffDays)) {
        const msg = `Asset '${r.asset_name}' expires in ${diffDays} days for customer ${r.customer?.name}.`;
        
        // 🔔 Alert Admin
        await notifyAdmins(
          "renewal_due",
          "📅 Renewal Due Soon",
          msg,
          `/renewals`
        );

        // 🔔 Alert Customer (if they have a portal login)
        if (r.customer?.portal_user_id) {
          await sendNotification(
            r.customer.portal_user_id,
            "renewal_due",
            "📅 Asset Expiry Alert",
            `Your asset '${r.asset_name}' expires in ${diffDays} days. Please contact us for renewal.`,
            `/renewals`
          );
        }

        await prisma.systemLog.create({
          data: {
            action: "RENEWAL_ALERT",
            details: `Notification sent: ${msg}`,
          },
        });
      }
    }

    console.log("🏁 Renewal Alert Engine Scan Complete.");
  } catch (err) {
    console.error("❌ Renewal Engine Error:", err);
  }
}

// Setup CRON job: '0 8 * * *' runs every day at 08:00 AM
function startRenewalCron() {
  nodeCron.schedule("0 8 * * *", () => {
    processRenewalAlerts();
  });
  console.log("🕒 Renewal Cron Job scheduled daily at 08:00 AM.");
  
  // Optional: Run once at startup for demonstration/validation
  processRenewalAlerts();
}

module.exports = {
  processRenewalAlerts,
  startRenewalCron,
};
