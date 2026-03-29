/**
 * Full real-time notification test — fires through API → DB → Socket.io → Browser Toast
 * Usage: node test-realtime-notif.js
 *
 * Requirements:
 *   - Backend running (npm start)
 *   - Frontend open in browser (npm start)
 *   - Logged in as any user
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const http = require("http");

const prisma = new PrismaClient({ log: ["error"] });

async function sendLiveNotification() {
    console.log("\n🔔 Real-time Notification Test\n" + "=".repeat(40));

    try {
        // Step 1: Find all admin users
        const admins = await prisma.user.findMany({ where: { role: "admin" } });
        if (admins.length === 0) {
            console.error("❌ No admin users found in DB.");
            return;
        }

        console.log(`✅ Found ${admins.length} admin(s):`, admins.map(a => `${a.full_name} (ID:${a.id})`).join(", "));

        // Step 2: Create notification in DB AND emit via Socket.io
        for (const admin of admins) {
            const notif = await prisma.notification.create({
                data: {
                    user_id: admin.id,
                    type: "ticket_created",
                    title: "🧪 Live Notification Test",
                    message: `Real-time test at ${new Date().toLocaleTimeString("en-IN")}. Check the bell! ✅`,
                    link: "/dashboard",
                    channel: "in_app",
                    is_read: false
                }
            });

            console.log(`✅ Notification #${notif.id} saved for ${admin.full_name}`);

            // Step 3: Emit via Socket.io to the running server
            const payload = JSON.stringify(notif);
            const req = http.request({
                hostname: "localhost",
                port: 5000,
                path: `/notifications/test-emit/${admin.id}`,
                method: "POST",
                headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
            });
            req.write(payload);
            req.end();
        }

        console.log("\n📌 Check your browser now:");
        console.log("   1. 🔔 Bell badge should show unread count");
        console.log("   2. 🍞 Toast should appear bottom-right (if logged in + frontend open)");
        console.log("   3. Click bell → see 'Live Notification Test'\n");

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

sendLiveNotification();
