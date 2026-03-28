/**
 * Neon DB diagnostic using Prisma (no extra packages needed)
 * Run: node diagnose-db.js
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

async function diagnose() {
    console.log("\n🔍 Neon Database Diagnostic\n" + "=".repeat(40));

    const url = process.env.DATABASE_URL || "(not set)";
    const host = url.match(/@([^/]+)\//)?.[1] || "unknown";
    console.log("📌 Host being used:", host);
    console.log("📌 Has pgbouncer?", url.includes("pgbouncer=true") ? "✅ YES" : "❌ NO");
    console.log("📌 Connection limit:", url.match(/connection_limit=(\d+)/)?.[1] || "default");

    console.log("\n⏳ Attempting Prisma connection (timeout: 30s)...\n");

    const prisma = new PrismaClient({ log: ["error"] });

    try {
        await prisma.$connect();
        console.log("✅ Connected successfully!");

        const count = await prisma.user.count();
        console.log(`✅ User count: ${count}`);

        const notifCount = await prisma.notification.count();
        console.log(`✅ Notification count: ${notifCount}`);

    } catch (err) {
        console.error("❌ CONNECTION FAILED");
        console.error("   Message:", err.message?.split("\n")[0]);
        console.error("\n📋 NEXT STEPS:");
        console.error("   1. Open https://console.neon.tech in your browser");
        console.error("   2. Find project: ep-nameless-mud-antifix5");
        console.error("   3. Check if Compute is ACTIVE (green dot) or PAUSED");
        console.error("   4. If paused — click the project, it will auto-resume");
        console.error("   5. Copy the POOLED connection string and paste to .env");
    } finally {
        await prisma.$disconnect();
        console.log("\n" + "=".repeat(40) + "\n");
    }
}

diagnose();
