const twilio = require("twilio");
const prisma = require("../config/prisma");

// TWILIO CONFIG
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

/**
 * Send real SMS alert via Twilio.
 */
async function sendRealSMS(userId, message) {
    try {
        if (!client) {
            console.log("📱 [SMS SKIPPED] Twilio not configured.");
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.phone) return;

        const response = await client.messages.create({
            body: `Linotec: ${message}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.phone
        });

        console.log(`📱 SMS sent to ${user.phone}: SID ${response.sid}`);
    } catch (err) {
        console.error("❌ SMS failed:", err.message);
    }
}

module.exports = { sendRealSMS };
