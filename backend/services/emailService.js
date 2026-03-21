const nodemailer = require("nodemailer");
const prisma = require("../config/prisma");

/**
 * Send real email via SMTP (SendGrid, AWS SES, etc).
 */
async function sendRealEmail(userId, title, message, link) {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.email) return;

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE === "true",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"Linotec Support" <${process.env.EMAIL_FROM || "no-reply@linotec.com"}>`,
            to: user.email,
            subject: title,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #007bff;">Linotec Notification</h2>
                    <p>Hello <b>${user.full_name}</b>,</p>
                    <p>${message}</p>
                    <div style="margin: 20px 0;">
                        <a href="${process.env.FRONTEND_URL}${link}" 
                           style="background: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                           View in Portal
                        </a>
                    </div>
                    <hr>
                    <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${user.email}: ${info.messageId}`);
    } catch (err) {
        console.error("❌ Email failed:", err.message);
    }
}

module.exports = { sendRealEmail };
