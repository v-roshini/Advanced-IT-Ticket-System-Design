const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");
const bcrypt = require("bcryptjs");

router.get("/", verifyToken, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { created_at: "desc" },
            include: { user: true }
        });

        // Agent Contact Redaction
        if (req.user.role === 'agent') {
            const canViewContact = await prisma.permission.findFirst({
                where: { role: 'agent', permission_key: 'can_view_customer_contact', is_enabled: true }
            });
            if (!canViewContact) {
                customers.forEach(c => {
                    c.email = "📧 [Hidden]";
                    c.phone = "📞 [Hidden]";
                });
            }
        }

        res.json(customers);
    } catch (err) {
        res.status(500).json({ message: "Error fetching customers" });
    }
});

// GET customer profile by ID
router.get("/:id", verifyToken, async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                tickets: { orderBy: { created_at: "desc" } },
                contracts: { orderBy: { created_at: "desc" } },
                billing: { orderBy: { created_at: "desc" } },
                renewal_assets: { orderBy: { expiry_date: "asc" } },
                user: true
            }
        });
        if (!customer) return res.status(404).json({ message: "Customer not found" });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ message: "Error fetching customer profile" });
    }
});

router.post("/", verifyToken, async (req, res) => {
    let { name, company, email, phone, type, status, notes, portal_login } = req.body;
    if (company) company = company.trim().toUpperCase();
    try {
        let portal_user_id = null;
        let generatedPassword = null;

        if (portal_login && email) {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (!existingUser) {
                generatedPassword = Math.random().toString(36).slice(-8); // Generate 8-char password
                const hashedPassword = await bcrypt.hash(generatedPassword, 10);
                const newUser = await prisma.user.create({
                    data: {
                        full_name: name,
                        email: email,
                        phone: phone || null,
                        role: "client",
                        password: hashedPassword,
                    }
                });
                portal_user_id = newUser.id;
            } else {
                portal_user_id = existingUser.id;
            }
        }

        const customer = await prisma.customer.create({
            data: { 
                name, company, email, phone, type: type || "Monthly", 
                status: status || "Active", notes, portal_user_id 
            },
        });
        
        res.status(201).json({ 
            message: "Customer added!", 
            customer, 
            generatedPassword 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating customer" });
    }
});

router.put("/:id", verifyToken, async (req, res) => {
    let { name, company, email, phone, type, status, notes } = req.body;
    if (company) company = company.trim().toUpperCase();
    try {
        const customer = await prisma.customer.update({
            where: { id: Number(req.params.id) },
            data: { name, company, email, phone, type, status, notes },
        });
        res.json({ message: "Customer updated!", customer });
    } catch (err) {
        res.status(500).json({ message: "Error updating customer" });
    }
});

router.post("/import", verifyToken, async (req, res) => {
    try {
        const customersToImport = req.body.customers;
        if (!Array.isArray(customersToImport) || customersToImport.length === 0) {
            return res.status(400).json({ message: "Invalid payload. Provide an array of customers." });
        }

        const createdCustomers = [];
        for (const data of customersToImport) {
            let company = data.company ? data.company.trim().toUpperCase() : null;
            const customer = await prisma.customer.create({
                data: {
                    name: data.name,
                    company: company,
                    email: data.email || null,
                    phone: data.phone || null,
                    type: data.type || "Monthly",
                    status: data.status || "Active",
                    notes: data.notes || null,
                }
            });
            createdCustomers.push(customer);
        }
        
        res.status(201).json({ message: `${createdCustomers.length} customers imported!`, customers: createdCustomers });
    } catch (err) {
        console.error("Bulk import error:", err);
        res.status(500).json({ message: "Error importing customers" });
    }
});

// Create portal login for existing customer
router.post("/:id/invite-portal", verifyToken, async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({ 
            where: { id: Number(req.params.id) },
            include: { user: true }
        });
        
        if (!customer) return res.status(404).json({ message: "Customer not found" });
        if (customer.user) return res.status(400).json({ message: "Portal access already exists" });
        if (!customer.email) return res.status(400).json({ message: "Customer email is required for portal access" });

        const generatedPassword = Math.random().toString(36).slice(-8); 
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        
        const newUser = await prisma.user.create({
            data: {
                full_name: customer.name,
                email: customer.email,
                role: "client",
                password: hashedPassword,
            }
        });

        await prisma.customer.update({
            where: { id: customer.id },
            data: { portal_user_id: newUser.id }
        });

        res.json({ message: "Portal access created", generatedPassword });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create portal access" });
    }
});

router.delete("/:id", verifyToken, async (req, res) => {
    try {
        await prisma.customer.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Customer deleted!" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting customer" });
    }
});

// Add Renewal Asset
router.post("/:id/assets", verifyToken, async (req, res) => {
    const { asset_name, asset_type, purchase_date, expiry_date, cost, supplier, notes } = req.body;
    try {
        const asset = await prisma.renewalAsset.create({
            data: {
                customer_id: Number(req.params.id),
                asset_name,
                asset_type: asset_type || "Other",
                purchase_date: purchase_date ? new Date(purchase_date) : null,
                expiry_date: new Date(expiry_date),
                cost: cost ? parseFloat(cost) : null,
                supplier,
                notes
            }
        });
        res.status(201).json({ message: "Asset added successfully", asset });
    } catch (err) {
        console.error("Asset Add Error:", err);
        res.status(500).json({ message: "Error adding asset" });
    }
});

// Delete Renewal Asset
router.delete("/assets/:assetId", verifyToken, async (req, res) => {
    try {
        await prisma.renewalAsset.delete({ where: { id: Number(req.params.assetId) } });
        res.json({ message: "Asset deleted!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting asset" });
    }
});

module.exports = router;
