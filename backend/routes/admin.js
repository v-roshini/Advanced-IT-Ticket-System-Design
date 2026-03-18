const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// ─────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────

// Get all users (Admin only)
router.get("/users", verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: "desc" },
      include: { customer: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user (Admin only)
router.put("/users/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { full_name, email, role, is_active, specialization, availability } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { full_name, email, role, is_active, specialization, availability }
    });
    res.json({ message: "User updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Deactivate/Activate user
router.patch("/users/:id/status", verifyToken, isAdmin, async (req, res) => {
  try {
    const { is_active } = req.body;
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { is_active: Boolean(is_active) }
    });
    res.json({ message: `User ${is_active ? 'Activated' : 'Deactivated'}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────
// SYSTEM LOGS
// ─────────────────────────────────────────

router.get("/logs", verifyToken, isAdmin, async (req, res) => {
  try {
    const logs = await prisma.systemLog.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
      include: { user: { select: { full_name: true, email: true } } }
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────
// BACKUP & EXPORT
// ─────────────────────────────────────────

router.get("/backup", verifyToken, isAdmin, async (req, res) => {
  try {
    const [tickets, customers, amc, users] = await Promise.all([
      prisma.ticket.findMany(),
      prisma.customer.findMany(),
      prisma.contractAMC.findMany(),
      prisma.user.findMany({ select: { id: true, full_name: true, email: true, role: true } })
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      tickets,
      customers,
      amc,
      users
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=linotec_backup.json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────
// PERMISSION ENGINE
// ─────────────────────────────────────────

// Get all permissions matrix
router.get("/permissions", verifyToken, isAdmin, async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ role: "asc" }, { permission_key: "asc" }],
      include: { updated_by: { select: { full_name: true } } }
    });
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle permission
router.patch("/permissions/:id", verifyToken, isAdmin, async (req, res) => {
  const { is_enabled } = req.body;
  try {
    const updated = await prisma.permission.update({
      where: { id: Number(req.params.id) },
      data: { 
        is_enabled: Boolean(is_enabled),
        updated_by_id: req.user.id
      }
    });
    
    // Log the change
    await prisma.systemLog.create({
      data: {
        action: "PERMISSION_TOGGLE",
        user_id: req.user.id,
        details: `Permission '${updated.permission_key}' for role '${updated.role}' set to ${updated.is_enabled}`
      }
    });

    res.json({ message: "Permission toggled", updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
