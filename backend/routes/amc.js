const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, "amc-" + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// GET all contracts
router.get("/", verifyToken, async (req, res) => {
    try {
        const contracts = await prisma.contractAMC.findMany({
            orderBy: { created_at: "desc" },
            include: { customer: { select: { name: true, company: true } } },
        });
        res.json(contracts);
    } catch (err) {
        console.error("❌ AMC GET Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

// POST create contract
router.post("/", verifyToken, async (req, res) => {
    const { customer_id, company_name, start_date, end_date, monthly_hours, priority_sla, extra_hour_rate, rollover_hours, scope_of_services } = req.body;

    if (!customer_id || !start_date || !end_date)
        return res.status(400).json({ message: "Customer, start date and end date are required" });

    try {
        console.log("📝 Creating AMC Contract:", { customer_id, start_date, end_date });

        // Ensure dates are parsed correctly
        const parsedStart = new Date(start_date);
        const parsedEnd = new Date(end_date);

        if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
            return res.status(400).json({ message: "Invalid date format provided" });
        }

        // Deduplication check
        const existing = await prisma.contractAMC.findFirst({
            where: {
                customer_id: Number(customer_id),
                start_date: parsedStart,
                end_date: parsedEnd,
            },
        });
        if (existing) {
            return res.status(400).json({ message: "A contract for this customer with the same dates already exists" });
        }

        const contract = await prisma.contractAMC.create({
            data: {
                customer_id: Number(customer_id),
                company_name: company_name || null,
                start_date: parsedStart,
                end_date: parsedEnd,
                monthly_hours: Number(monthly_hours) || 10,
                priority_sla: priority_sla || null,
                hours_used: 0,
                extra_hour_rate: Number(extra_hour_rate) || 0,
                rollover_hours: Boolean(rollover_hours),
                scope_of_services: scope_of_services || null
            },
        });
        console.log("✅ AMC Contract added successfully!");
        res.status(201).json({ message: "Contract added!", contract });
    } catch (err) {
        console.error("❌ AMC POST Error:", err);
        res.status(500).json({ message: "Database error: " + err.message });
    }
});

// PUT update hours used
router.put("/:id/hours", verifyToken, async (req, res) => {
    const { hours_used } = req.body;
    try {
        const contract = await prisma.contractAMC.update({
            where: { id: Number(req.params.id) },
            data: { hours_used: Number(hours_used) },
        });

        // P2: Keep history log
        await prisma.contractHistory.create({
            data: {
                contract_id: contract.id,
                field_changed: "hours_used",
                new_value: String(hours_used),
                changed_by: req.user.id
            }
        });

        res.json({ message: "Hours updated!", contract });
    } catch (err) {
        console.error("❌ AMC PUT Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

// POST upload PDF attachment
router.post("/:id/upload", verifyToken, upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        const filePath = `/uploads/${req.file.filename}`;

        const contract = await prisma.contractAMC.update({
            where: { id: Number(req.params.id) },
            data: { attachment_url: filePath }
        });

        // P2: Log history
        await prisma.contractHistory.create({
            data: {
                contract_id: contract.id,
                field_changed: "attachment_url",
                new_value: filePath,
                changed_by: req.user.id
            }
        });

        res.json({ message: "AMC PDF Attached!", contract });
    } catch (err) {
        console.error("Upload error:", err.message);
        res.status(500).json({ message: "Failed to attach file" });
    }
});

// DELETE contract
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        await prisma.contractAMC.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Contract deleted!" });
    } catch (err) {
        console.error("❌ AMC DELETE Error:", err.message);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
