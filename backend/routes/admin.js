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

// Seed permissions via UI
router.post("/permissions/seed", verifyToken, isAdmin, async (req, res) => {
  const agentPermissions = [
    'can_view_tickets', 'can_view_renewals', 'can_create_ticket', 'can_close_ticket',
    'can_reassign_ticket', 'can_edit_ticket', 'can_delete_ticket', 'can_add_work_log',
    'can_view_customer_contact', 'can_view_billing', 'can_view_amc_contracts',
    'can_generate_invoice', 'can_add_internal_note', 'can_escalate_ticket', 'can_view_reports'
  ];

  const customerPermissions = [
    'can_view_own_tickets', 'can_create_ticket', 'can_add_comment', 'can_view_work_hours',
    'can_view_billing', 'can_download_invoice', 'can_view_amc_status', 'can_view_renewals',
    'can_receive_renewal_alerts', 'can_approve_resolution', 'can_rate_ticket', 'can_view_assigned_agent',
    'can_view_reports'
  ];

  try {
    for (const key of agentPermissions) {
      await prisma.permission.upsert({
        where: { role_permission_key: { role: 'agent', permission_key: key } },
        update: {},
        create: { role: 'agent', permission_key: key, is_enabled: true }
      });
    }
    for (const key of customerPermissions) {
      await prisma.permission.upsert({
        where: { role_permission_key: { role: 'client', permission_key: key } },
        update: {},
        create: { role: 'client', permission_key: key, is_enabled: true }
      });
    }
    res.json({ message: "Default permissions seeded successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
