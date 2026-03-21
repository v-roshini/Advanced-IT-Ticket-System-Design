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
app.use("/api/admin", require("./routes/admin")); // P1: Admin Panel Logic
app.use("/ai", require("./routes/ai"));
app.use("/renewals", require("./routes/renewals"));
app.use("/notifications", require("./routes/notifications"));
app.use("/api/reports", require("./routes/reports"));

app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
    res.json({ message: "✅ Linotec API is running!" });
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
        origin: "*", // Adjust in production
        methods: ["GET", "POST"]
    }
});

// Socket.io Connection
io.on("connection", (socket) => {
    console.log("🔌 New Client Connected:", socket.id);

    socket.on("join", (userId) => {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined their notification room.`);
    });

    socket.on("disconnect", () => {
        console.log("🔌 Client Disconnected:", socket.id);
    });
});

// Export io for use in other files
global.io = io;

server.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    const prisma = require("./config/prisma");
    try {
        await prisma.$connect();
        console.log("✅ Database Connected Successfully (Prisma)!");
    } catch (err) {
        console.error("❌ Database Connection Failed:", err.message);
    }

    // --- Renewal Manager Module ---
    const { startRenewalCron } = require("./services/renewalService");
    startRenewalCron();

    // --- SLA Manager & Engine Module ---
    const { startSLACron } = require("./services/slaService");
    startSLACron();
});

