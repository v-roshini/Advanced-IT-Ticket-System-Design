const prisma = require("../config/prisma");

/**
 * Send a notification to a specific user.
 * @param {number} userId - ID of the user to notify.
 * @param {string} type - Notification type (e.g., 'ticket_assigned').
 * @param {string} title - Brief title of the notification.
 * @param {string} message - Details of the notification.
 * @param {string} link - URL to navigate to when clicked.
 * @param {string} channel - Channel to send via ('in_app', 'email', 'sms').
 */
async function sendNotification(userId, type, title, message, link, channel = "in_app") {
    try {
        const notification = await prisma.notification.create({
            data: {
                user_id: userId,
                type,
                title,
                message,
                link,
                channel
            }
        });

        // ✅ Step 1: Real-time Notification via Socket.io
        if (global.io) {
            global.io.to(`user_${userId}`).emit("notification", notification);
            console.log(`📤 [Socket.io] Real-time notify to User ${userId}: ${title}`);
        }

        // ✅ Step 2: LOGIC FOR EXTERNAL CHANNELS (EMAIL/SMS)
        if (channel === "email") {
            const { sendRealEmail } = require("./emailService");
            await sendRealEmail(userId, title, message, link);
        } else if (channel === "sms") {
            const { sendRealSMS } = require("./smsService");
            await sendRealSMS(userId, message);
        }

        return notification;
    } catch (err) {
        console.error("❌ Notification error:", err);
    }
}


/**
 * Notify all admins about an event.
 */
async function notifyAdmins(type, title, message, link, channel = "in_app") {
    const admins = await prisma.user.findMany({ where: { role: "admin" } });
    for (const admin of admins) {
        await sendNotification(admin.id, type, title, message, link, channel);
    }
}

module.exports = {
    sendNotification,
    notifyAdmins
};
