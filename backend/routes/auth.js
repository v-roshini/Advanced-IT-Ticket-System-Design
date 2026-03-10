const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
require("dotenv").config();

// REGISTER
router.post("/register", async (req, res) => {
    const { full_name, email, phone, role, password } = req.body;

    if (!full_name || !email || !password)
        return res.status(400).json({ message: "All fields are required" });

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the User
        const user = await prisma.user.create({
            data: {
                full_name,
                email,
                phone,
                role: role || "client",
                password: hashedPassword,
            },
        });

        // ✅ If user is a 'client', also save them as a 'Customer'
        if (user.role === "client") {
            await prisma.customer.create({
                data: {
                    name: full_name,
                    email: email,
                    phone: phone || null,
                    company: req.body.company || null,
                    type: "Monthly", // Default type
                },
            });
        }

        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Registration failed" });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: "Email and password required" });

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ message: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ message: "Invalid email or password" });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
