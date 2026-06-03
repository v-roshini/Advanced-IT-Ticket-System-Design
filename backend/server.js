const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/tickets", require("./routes/tickets"));
app.use("/customers", require("./routes/customers"));
app.use("/worklog", require("./routes/worklog"));
app.use("/agents", require("./routes/agents"));
app.use("/amc", require("./routes/amc"));
app.use("/api/billing", require("./routes/billing"));
app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/admin", require("./routes/admin"));
app.use("/ai", require("./routes/ai"));
app.use("/renewals", require("./routes/renewals"));
app.use("/notifications", require("./routes/notifications"));
app.use("/api/reports", require("./routes/reports"));
app.use("/chat", require("./routes/chat"));

app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
    res.json({ message: "✅ Lenok API is running!" });
});

process.on("uncaughtException", (err) => {
    console.error("❌ Error:", err.message);
});

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err.message);
});

const PORT = process.env.PORT || 5000;
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Export io for use in other files
global.io = io;

server.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    const prisma = require("./config/prisma");

    // Retry up to 10 times — Neon cold starts can take a few seconds
    let connected = false;
    for (let attempt = 1; attempt <= 10; attempt++) {
        try {
            await prisma.$connect();
            console.log("✅ Database Connected Successfully (Prisma)!");
            connected = true;
            break;
        } catch (err) {
            console.warn(`⚠️ DB connect attempt ${attempt}/10 failed: ${err.message}. Retrying in 5s...`);
            if (attempt < 10) await new Promise(r => setTimeout(r, 5000));
        }
    }

    if (!connected) {
        console.error("❌ Database could not connect after 10 attempts. Exiting process.");
        process.exit(1);
    }

    // --- 🎯 REGISTER SOCKET LISTENERS ONLY AFTER DB IS READY ---
    io.on("connection", (socket) => {
        console.log("🔌 New Client Connected:", socket.id);

        socket.on("join", (userId) => {
            socket.join(`user_${userId}`);
            console.log(`👤 User ${userId} joined their notification room.`);
            
            // 📅 Proactively remind user about expiring/expired renewals upon login
            const { notifyUserOfExpiringRenewals } = require("./services/renewalService");
            notifyUserOfExpiringRenewals(Number(userId));
        });

        socket.on("disconnect", () => {
            console.log("🔌 Client Disconnected:", socket.id);
        });
    });

    // --- 🔄 START CRON JOBS ONLY AFTER DB IS READY ---
    const { startRenewalCron } = require("./services/renewalService");
    startRenewalCron();

    const { startSLACron } = require("./services/slaService");
    startSLACron();

    const { startBillingCron } = require("./services/billingService");
    startBillingCron();
});
