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
        const oldStatus = r.status;
        await prisma.renewal.update({
          where: { id: r.id },
          data: { status: newStatus },
        });
        console.log(`✅ Status updated for ${r.asset_name}: ${oldStatus} → ${newStatus}`);

        // 🔔 Alert when status changes to critical (Handles assets created already within the window)
        if (newStatus === "expiring_soon" || newStatus === "expired") {
            const urgencyMsg = newStatus === "expired" ? "has EXPIRED" : `expires in ${diffDays} days`;
            const msg = `Asset '${r.asset_name}' ${urgencyMsg} for customer ${r.customer?.name}.`;
            
            await notifyAdmins("renewal_due", `⚠️ Renewal Status: ${newStatus.toUpperCase().replace('_', ' ')}`, msg, "/renewals");
            
            if (r.customer?.portal_user_id) {
                await sendNotification(r.customer.portal_user_id, "renewal_due", "🚨 Urgent: Asset Renewal Needed", `Your asset '${r.asset_name}' ${urgencyMsg}. please contact us support@lenok.it for renewal.`, "/renewals");
            }
        }
      }

      // Auto-Ticket Creation (if 3 days overdue)
      if (diffDays <= -3) {
        // Only create one ticket per asset
        const existingTicket = await prisma.ticket.findFirst({
          where: {
            issue_title: `URGENT: ${r.asset_name} renewal overdue for ${r.customer?.name}`,
            created_at: { gte: r.expiry_date }
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

      // Alert Notification Logic
      const alertDays = [60, 15, 3, 1];
      let shouldNotify = alertDays.includes(diffDays);

      if (diffDays === 30 && r.remind_one_month) shouldNotify = true;
      if (diffDays === 7 && r.remind_one_week) shouldNotify = true;

      if (shouldNotify) {
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
    // 🏁 End of the regular asset scanning loop

    // --- 📅 AMC Expiry Scan ---
    console.log("⏱️ Scanning AMC Contracts for Expiry...");
    const amcs = await prisma.contractAMC.findMany({
      include: { customer: true }
    });

    for (const amc of amcs) {
      const expDate = new Date(amc.end_date);
      expDate.setHours(0, 0, 0, 0);

      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const alertDays = [30, 7, 3, 1];
      if (alertDays.includes(diffDays)) {
        const msg = `AMC contract for customer '${amc.customer?.name}' expires in ${diffDays} days.`;
        
        await notifyAdmins("amc_expiry", "⚠️ AMC Contract Expiry", msg, "/amc");
        
        if (amc.customer?.portal_user_id) {
          await sendNotification(
            amc.customer.portal_user_id,
            "amc_expiry",
            "📅 AMC Contract Expiry Alert",
            `Your Annual Maintenance Contract (AMC) with us expires in ${diffDays} days. Please contact us for renewal.`,
            "/amc"
          );
        }
      }
    }

    // --- Monthly Summary Notification ---
    await sendMonthlyRenewalSummary();

    console.log("🏁 Renewal Alert Engine Scan Complete.");
  } catch (err) {
    console.error("❌ Renewal Engine Error:", err);
  }
}

/**
 * Aggregates all renewals for the current month into a single summary notification for admins.
 */
async function sendMonthlyRenewalSummary() {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthlyRenewals = await prisma.renewal.findMany({
      where: {
        expiry_date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    if (monthlyRenewals.length === 0) return;

    const completed = monthlyRenewals.filter(r => r.status === "renewed").length;
    const pending = monthlyRenewals.filter(r => r.status !== "renewed").length;

    const summaryMsg = `This Month: ${monthlyRenewals.length} Total Renewals. ✅ ${completed} Completed, ⏳ ${pending} Pending.`;
    
    await notifyAdmins(
      "renewal_summary",
      "📊 Monthly Renewal Summary",
      summaryMsg,
      "/renewals"
    );

    console.log("📊 Monthly Renewal Summary Notification Sent.");
  } catch (err) {
    console.error("❌ Monthly Summary Error:", err);
  }
}

// Setup CRON job: '0 8 * * *' runs every day at 08:00 AM
function startRenewalCron() {
  nodeCron.schedule("0 8 * * *", () => {
    processRenewalAlerts();
  });
  console.log("🕒 Renewal Cron Job scheduled daily at 08:00 AM.");
  
  // Run once at startup for demonstration/validation
  processRenewalAlerts();
}

/**
 * Proactively reminds a specific user of their expiring renewals.
 * Called on login/socket connection.
 */
async function notifyUserOfExpiringRenewals(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true }
    });

    if (!user) return;

    let where = { status: { in: ["expiring_soon", "expired"] } };

    // If client, only show their own
    if (user.role === "client") {
        if (!user.customer) return;
        where.customer_id = user.customer.id;
    }

    const urgentRenewals = await prisma.renewal.findMany({ where });

    if (urgentRenewals.length > 0) {
        const expiringCount = urgentRenewals.filter(r => r.status === "expiring_soon").length;
        const expiredCount = urgentRenewals.filter(r => r.status === "expired").length;

        let msg = `You have ${urgentRenewals.length} urgent renewals: `;
        if (expiredCount > 0) msg += `🔴 ${expiredCount} EXPIRED `;
        if (expiringCount > 0) msg += `⏳ ${expiringCount} Expiring Soon`;

        // Emit real-time notification (Toast only, no DB entry to avoid spam)
        if (global.io) {
            global.io.to(`user_${userId}`).emit("notification", {
                type: "renewal_due",
                title: "📅 Renewal Reminder",
                message: msg,
                link: "/renewals",
                is_read: false,
                created_at: new Date()
            });
            console.log(`📡 [Socket.io] Login-time reminder sent to User ${userId}`);
        }
    }
  } catch (err) {
    if (err.code === 'P1001' || err.code === 'P1017' || err.name === 'PrismaClientInitializationError') {
      console.warn("⚠️  Renewal Reminder: DB is sleeping/connecting. Skipping login reminder.");
    } else {
      console.error("❌ Login Reminder Error:", err);
    }
  }
}

module.exports = {
  processRenewalAlerts,
  startRenewalCron,
  notifyUserOfExpiringRenewals,
};
