const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// Helper function to handle date range filter
const getDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    return {
        gte: new Date(startDate),
        lte: new Date(endDate)
    };
};

// ─────────────────────────────────────────
// 1. GET Dashboard Overview KPIs (Always Open for Logged In)
// ─────────────────────────────────────────
router.get("/dashboard-stats", verifyToken, async (req, res) => {
    try {
        const totalTickets = await prisma.ticket.count();
        const openTickets = await prisma.ticket.count({ where: { status: "Open" } });
        const inProgress = await prisma.ticket.count({ where: { status: "In_Progress" } });
        const resolved = await prisma.ticket.count({ where: { status: "Resolved" } });
        
        // SLA Compliance %
        const breached = await prisma.ticket.count({ where: { sla_status: "breached" } });
        const onTrack = await prisma.ticket.count({ where: { sla_status: "on_track" } });
        const slaCompliance = onTrack + breached > 0 ? Math.round((onTrack / (onTrack + breached)) * 100) : 100;

        // Financials (Monthly)
        const currentMonth = new Date().toISOString().slice(0, 7);
        const revenue = await prisma.billing.aggregate({
            where: { month: currentMonth },
            _sum: { total_amount: true }
        });

        res.json({
            stats: {
                totalTickets,
                open: openTickets,
                inProgress,
                resolved,
                slaCompliance,
                monthlyRevenue: revenue._sum.total_amount || 0,
                activeCustomers: await prisma.customer.count({ where: { status: "Active" } })
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Error" });
    }
});

// ─────────────────────────────────────────
// 2. PROTECTED REPORTS (Requires can_view_reports per Role)
// ─────────────────────────────────────────
router.use(verifyToken, checkPermission('can_view_reports'));

/** 
 * ADMIN REPORTS (v4.6.1)
 */

// Ticket Summary Report
router.get("/ticket-summary", verifyToken, async (req, res) => {
    const { startDate, endDate, customer_id, priority, category } = req.query;
    try {
        const where = {};
        if (startDate && endDate) where.created_at = getDateRange(startDate, endDate);
        if (customer_id) where.customer_id = parseInt(customer_id);
        if (priority) where.priority = priority;
        if (category) where.category = category;

        const summaryByStatus = await prisma.ticket.groupBy({
            by: ['status'],
            where,
            _count: { id: true }
        });

        const summaryByPriority = await prisma.ticket.groupBy({
            by: ['priority'],
            where,
            _count: { id: true }
        });

        const summaryByCategory = await prisma.ticket.groupBy({
            by: ['category'],
            where,
            _count: { id: true }
        });

        res.json({ summaryByStatus, summaryByPriority, summaryByCategory });
    } catch (err) {
        res.status(500).json({ message: "Error fetching ticket summary" });
    }
});

// Agent Performance Report
router.get("/agent-performance", verifyToken, async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const agents = await prisma.user.findMany({
            where: { role: "agent" },
            select: {
                id: true,
                full_name: true,
                tickets: {
                    where: {
                        created_at: startDate && endDate ? getDateRange(startDate, endDate) : undefined,
                        status: "Resolved"
                    },
                    select: {
                        id: true,
                        sla_status: true,
                        rating: true,
                        created_at: true,
                        // Assuming we have a field or way to calc resolution time
                        // For simplicity, we'll aggregate count and ratings
                    }
                }
            }
        });

        const performanceData = agents.map(agent => {
            const resolvedCount = agent.tickets.length;
            const slaMet = agent.tickets.filter(t => t.sla_status === "on_track").length;
            const avgRating = agent.tickets.length > 0 
                ? agent.tickets.reduce((sum, t) => sum + (t.rating || 0), 0) / agent.tickets.filter(t => t.rating).length 
                : 0;
            
            return {
                agent_id: agent.id,
                name: agent.full_name,
                resolvedCount,
                slaCompliance: resolvedCount > 0 ? Math.round((slaMet / resolvedCount) * 100) : 100,
                csatScore: avgRating.toFixed(1)
            };
        });

        res.json(performanceData);
    } catch (err) {
        res.status(500).json({ message: "Error fetching agent performance" });
    }
});

// SLA Compliance Report
router.get("/sla-compliance", verifyToken, async (req, res) => {
    const { startDate, endDate, priority } = req.query;
    try {
        const where = { sla_status: { not: null } };
        if (startDate && endDate) where.created_at = getDateRange(startDate, endDate);
        if (priority) where.priority = priority;

        const compliance = await prisma.ticket.groupBy({
            by: ['priority', 'sla_status'],
            where,
            _count: { id: true }
        });

        res.json(compliance);
    } catch (err) {
        res.status(500).json({ message: "Error fetching SLA compliance" });
    }
});

// Customer Activity Report
router.get("/customer-activity", verifyToken, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                _count: {
                    select: { tickets: true }
                },
                tickets: {
                    where: { status: { not: "Closed" } },
                    select: { id: true }
                }
            }
        });

        const activity = customers.map(c => ({
            id: c.id,
            name: c.name,
            totalTickets: c._count.tickets,
            openIssues: c.tickets.length,
            satisfaction: 0 // Will link to ratings later
        }));

        res.json(activity);
    } catch (error) {
        res.status(500).json({ message: "Error fetching customer activity" });
    }
});

// Renewal Report
router.get("/renewal-report", verifyToken, async (req, res) => {
    const { days } = req.query; // 30, 60, 90
    const filterDate = new Date();
    filterDate.setDate(filterDate.getDate() + parseInt(days || 30));

    try {
        const renewals = await prisma.renewal.findMany({
            where: {
                expiry_date: {
                    lte: filterDate,
                    gte: new Date()
                }
            },
            include: { customer: { select: { name: true } } }
        });
        res.json(renewals);
    } catch (err) {
        res.status(500).json({ message: "Error fetching renewal report" });
    }
});

// AMC Utilisation Report
router.get("/amc-utilisation", verifyToken, async (req, res) => {
    try {
        const contracts = await prisma.contractAMC.findMany({
            include: { customer: { select: { name: true } } }
        });
        res.json(contracts.map(c => ({
            customer: c.customer.name,
            contractedHours: c.monthly_hours,
            usedHours: c.hours_used,
            overage: Math.max(0, c.hours_used - c.monthly_hours)
        })));
    } catch (err) {
        res.status(500).json({ message: "Error fetching AMC utilisation" });
    }
});

// Revenue Report
router.get("/revenue-report", verifyToken, async (req, res) => {
    try {
        const billings = await prisma.billing.findMany({
            include: { invoices: { select: { status: true, total_amout_with_tax: true } } }
        });

        // Simplified grouping for annual trend (mocking months)
        const revenueTrend = {};
        billings.forEach(b => {
            revenueTrend[b.month] = (revenueTrend[b.month] || 0) + (b.total_amount || 0);
        });

        res.json({ revenueTrend, totalBilled: 0, totalCollected: 0, outstanding: 0 }); // Placeholder for detailed calcs
    } catch (err) {
        res.status(500).json({ message: "Error fetching revenue report" });
    }
});

// Work Log Report
router.get("/work-log-report", verifyToken, async (req, res) => {
    const { startDate, endDate, agent_id, customer_id } = req.query;
    try {
        const where = {};
        if (startDate && endDate) where.created_at = getDateRange(startDate, endDate);
        if (agent_id) where.agent_id = parseInt(agent_id);
        if (customer_id) where.ticket = { customer_id: parseInt(customer_id) };

        const workLogs = await prisma.workLog.findMany({
            where,
            include: {
                agent: { select: { full_name: true } },
                ticket: { select: { ticket_no: true, customer_name: true } }
            }
        });
        res.json(workLogs);
    } catch (err) {
        res.status(500).json({ message: "Error fetching work log report" });
    }
});

/**
 * CLIENT REPORTS (v4.6.2)
 */

// My Tickets Summary
router.get("/customer/my-tickets", verifyToken, async (req, res) => {
    const customer_id = req.user.customer_id; // Added by authMiddleware if user is client
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { customer: true }
        });
        
        if (!user.customer) return res.status(403).json({ message: "Not a customer user" });

        const summary = await prisma.ticket.groupBy({
            by: ['status'],
            where: { customer_id: user.customer.id },
            _count: { id: true }
        });
        res.json(summary);
    } catch (err) {
        res.status(500).json({ message: "Error fetching my tickets summary" });
    }
});

// Work Hours Statement
router.get("/customer/work-hours", verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { customer: true }
        });
        if (!user.customer) return res.status(403).json({ message: "Not a customer user" });

        const workLogs = await prisma.workLog.findMany({
            where: { ticket: { customer_id: user.customer.id } },
            include: { ticket: { select: { ticket_no: true, issue_title: true } } }
        });
        res.json(workLogs);
    } catch (err) {
        res.status(500).json({ message: "Error fetching work hours" });
    }
});

// Dashboard helper routes (preserving existing)
router.get("/ticket-trends", verifyToken, async (req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    try {
        const createdData = await prisma.ticket.groupBy({
            by: ['created_at'],
            where: { created_at: { gte: thirtyDaysAgo } },
            _count: { id: true }
        });
        res.json({ createdData });
    } catch (err) {
        res.status(500).json({ message: "Error" });
    }
});

// GET Agent Workload
router.get("/agent-workload", verifyToken, async (req, res) => {
    try {
        const workload = await prisma.user.findMany({
            where: { role: "agent" },
            select: {
                full_name: true,
                _count: {
                    select: { tickets: { where: { status: { notIn: ["Resolved", "Closed"] } } } }
                }
            }
        });
        res.json(workload.map(a => ({ name: a.full_name, openCount: a._count.tickets })));
    } catch (err) {
        res.status(500).json({ message: "Error" });
    }
});

// Activity Feed (Recent 15 Events)
router.get("/activity-feed", verifyToken, async (req, res) => {
    try {
        const auditLogs = await prisma.ticketAuditLog.findMany({
            orderBy: { created_at: "desc" },
            take: 15,
            include: { user: { select: { full_name: true } }, ticket: { select: { ticket_no: true } } }
        });
        res.json(auditLogs);
    } catch (err) {
        res.status(500).json({ message: "Error" });
    }
});

module.exports = router;
