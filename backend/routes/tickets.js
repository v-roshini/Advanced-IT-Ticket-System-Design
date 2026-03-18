const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Helper to get customer ID for a portal user
async function getCustomerId(userId) {
    const customer = await prisma.customer.findUnique({
        where: { portal_user_id: userId }
    });
    return customer?.id;
}

// GET all tickets
router.get("/", verifyToken, async (req, res) => {
    try {
        // Role-based access: admins & agents see all, clients only see their own
        // No DB permission lookup needed here — role itself defines access

        const { customer, agent } = req.query;
        let whereClause = {};

        // If customer, they can ONLY see their own tickets
        if (req.user.role === 'client') {
            const custId = await getCustomerId(req.user.id);
            if (!custId) return res.status(403).json({ message: "Customer profile not found" });
            whereClause.customer_id = custId;
        } else {
            if (customer) whereClause.customer_id = Number(customer);
            if (agent) whereClause.agent_id = Number(agent);
        }

        const tickets = await prisma.ticket.findMany({
            where: whereClause,
            orderBy: { created_at: "desc" },
            include: { agent: { select: { full_name: true } } },
        });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: "Error fetching tickets" });
    }
});

// GET single ticket
router.get("/:id", verifyToken, async (req, res) => {
    try {
        const ticket = await prisma.ticket.findUnique({
            where: { id: Number(req.params.id) },
            include: {
                agent: { select: { id: true, full_name: true } },
                comments: { 
                    include: { user: { select: { full_name: true, role: true } } },
                    orderBy: { created_at: "asc" }
                },
                work_logs: true,
                attachments: true,
                audit_logs: {
                    include: { user: { select: { full_name: true } } },
                    orderBy: { created_at: "desc" }
                },
                parent: { select: { id: true, ticket_no: true, issue_title: true } },
                related: { select: { id: true, ticket_no: true, issue_title: true } }
            },
        });
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });

        // Security check for clients
        if (req.user.role === 'client') {
            const custId = await getCustomerId(req.user.id);
            if (ticket.customer_id !== custId) {
                return res.status(403).json({ message: "You do not have permission to view this ticket" });
            }

            // Filter out internal notes
            ticket.comments = ticket.comments.filter(c => !c.is_internal);

            // Hide agent assignment if permission is off
            const canSeeAgent = await prisma.permission.findFirst({
                where: { role: 'client', permission_key: 'can_view_assigned_agent', is_enabled: true }
            });
            if (!canSeeAgent) ticket.agent = null;

            // Hide work hours if permission is off
            const canSeeHours = await prisma.permission.findFirst({
                where: { role: 'client', permission_key: 'can_view_work_hours', is_enabled: true }
            });
            if (!canSeeHours) ticket.work_logs = [];
        }

        res.json(ticket);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching ticket" });
    }
});

// CREATE ticket
router.post("/", verifyToken, checkPermission('can_create_ticket'), upload.array("attachments", 5), async (req, res) => {
    let { customer_id, customer_name, company, issue_title, description, priority, category, project, source, parent_id } = req.body;
    const ticket_no = "TKT" + Date.now().toString().slice(-6);

    // If client, automatically bind their customer ID
    if (req.user.role === 'client') {
        const custId = await getCustomerId(req.user.id);
        if (custId) {
            customer_id = custId;
            const customer = await prisma.customer.findUnique({ where: { id: custId } });
            customer_name = customer.name;
            company = customer.company;
        }
    }

    if (customer_id) {
        const customer = await prisma.customer.findUnique({ where: { id: Number(customer_id) } });
        if (customer) {
            customer_name = customer.name;
            company = customer.company || company;
        }
    }

    if (company) company = company.trim().toUpperCase();

    // SLA Deadline Calculation
    const now = new Date();
    let deadline = new Date();
    if (priority === 'Critical') deadline.setHours(now.getHours() + 4);
    else if (priority === 'High') deadline.setHours(now.getHours() + 8);
    else if (priority === 'Medium') deadline.setHours(now.getHours() + 24);
    else deadline.setHours(now.getHours() + 48);

    try {
        const ticketData = {
            ticket_no,
            customer_id: customer_id ? Number(customer_id) : null,
            customer_name,
            company,
            issue_title,
            description,
            priority: priority || "Medium",
            category,
            project,
            source: source || "Web Portal",
            deadline,
            parent_id: parent_id ? Number(parent_id) : null,
            audit_logs: {
                create: {
                    action: "Created",
                    details: `Ticket created via ${source || "Web Portal"}`,
                    user_id: req.user.id
                }
            }
        };

        if (req.files && req.files.length > 0) {
            ticketData.attachments = {
                create: req.files.map(file => ({
                    file_name: file.originalname,
                    file_path: file.filename,
                    file_type: file.mimetype
                }))
            };
        }

        const ticket = await prisma.ticket.create({
            data: ticketData,
        });
        res.status(201).json({ message: "Ticket created!", ticket });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating ticket" });
    }
});

// UPDATE ticket
router.put("/:id", verifyToken, async (req, res) => {
    const { status, agent_id, issue_title, description, priority, category, project, parent_id, rating, rating_comment } = req.body;

    // Only admins can assign/change the agent on a ticket
    if (agent_id !== undefined && req.user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can assign agents to tickets." });
    }

    // Only admins and agents can update ticket status or details
    if (req.user.role === "client") {
        // Allow client to reopen or close if status is provided and relevant
        if (status && (status === "Reopened" || status === "Closed")) {
            // Proceed
        } else {
            return res.status(403).json({ message: "Customers can only Reopen or Close resolved tickets." });
        }
    }

    try {
        const oldTicket = await prisma.ticket.findUnique({ where: { id: Number(req.params.id) } });
        if (!oldTicket) return res.status(404).json({ message: "Ticket not found" });

        const updateData = {};
        const auditEntries = [];

        if (status !== undefined && status !== oldTicket.status) {
            updateData.status = status;
            auditEntries.push({ action: "Status Changed", details: `Changed from ${oldTicket.status} to ${status}`, user_id: req.user.id });
        }
        if (issue_title !== undefined) updateData.issue_title = issue_title;
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined && priority !== oldTicket.priority) {
            updateData.priority = priority;
            auditEntries.push({ action: "Priority Changed", details: `Changed from ${oldTicket.priority} to ${priority}`, user_id: req.user.id });
            
            // Recalculate deadline if priority changes? (Optional but good for P1)
            let deadline = new Date(oldTicket.created_at);
            if (priority === 'Critical') deadline.setHours(deadline.getHours() + 4);
            else if (priority === 'High') deadline.setHours(deadline.getHours() + 8);
            else if (priority === 'Medium') deadline.setHours(deadline.getHours() + 24);
            else deadline.setHours(deadline.getHours() + 48);
            updateData.deadline = deadline;
        }
        if (category !== undefined) updateData.category = category;
        if (project !== undefined) updateData.project = project;
        if (parent_id !== undefined) updateData.parent_id = parent_id ? Number(parent_id) : null;

        if (rating !== undefined) updateData.rating = Number(rating);
        if (rating_comment !== undefined) updateData.rating_comment = rating_comment;

        if (req.user.role === "admin" && agent_id !== undefined && Number(agent_id) !== oldTicket.agent_id) {
            updateData.agent_id = agent_id ? Number(agent_id) : null;
            auditEntries.push({ action: "Agent Assigned", details: agent_id ? `Assigned to user ID ${agent_id}` : "Unassigned", user_id: req.user.id });
        }

        const ticket = await prisma.ticket.update({
            where: { id: Number(req.params.id) },
            data: {
                ...updateData,
                audit_logs: {
                    create: auditEntries
                }
            },
        });
        res.json({ message: "Ticket updated!", ticket });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating ticket" });
    }
});

// DELETE ticket
router.delete("/:id", verifyToken, checkPermission('can_delete_ticket'), async (req, res) => {
    try {
        await prisma.ticket.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: "Ticket deleted!" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting ticket" });
    }
});

// POST a comment on a ticket
router.post("/:id/comments", verifyToken, checkPermission('can_add_comment'), async (req, res) => {
    const { message, is_internal } = req.body;
    
    // Clients cannot post internal notes
    if (is_internal && req.user.role === "client") {
        return res.status(403).json({ message: "Customers cannot post internal notes." });
    }

    try {
        const comment = await prisma.ticketComment.create({
            data: {
                ticket_id: Number(req.params.id),
                user_id: req.user.id,
                message,
                is_internal: is_internal || false,
            },
            include: { user: { select: { full_name: true, role: true } } }
        });
        
        // Log action
        await prisma.ticketAuditLog.create({
            data: {
                ticket_id: Number(req.params.id),
                user_id: req.user.id,
                action: is_internal ? "Internal Note Added" : "Comment Added",
                details: message.substring(0, 50) + (message.length > 50 ? "..." : "")
            }
        });
        
        res.status(201).json({ message: "Comment added!", comment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error adding comment" });
    }
});

// POST attachments to an existing ticket
router.post("/:id/attachments", verifyToken, upload.array("attachments", 5), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
    }

    try {
        const ticketId = Number(req.params.id);
        
        const attachments = await prisma.ticketAttachment.createMany({
            data: req.files.map(file => ({
                ticket_id: ticketId,
                file_name: file.originalname,
                file_path: file.filename,
                file_type: file.mimetype
            }))
        });

        // Log action
        await prisma.ticketAuditLog.create({
            data: {
                ticket_id: ticketId,
                user_id: req.user.id,
                action: "Attachment Added",
                details: `Added ${req.files.length} attachment(s)`
            }
        });

        res.status(201).json({ message: "Attachments uploaded!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error uploading attachments" });
    }
});

// POST bulk update tickets
router.post("/bulk-update", verifyToken, async (req, res) => {
    const { ticketIds, status, agent_id } = req.body;
    
    if (req.user.role === 'client') return res.status(403).json({ message: "Forbidden" });
    if (agent_id !== undefined && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can assign agents" });
    }

    try {
        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (req.user.role === 'admin' && agent_id !== undefined) {
            updateData.agent_id = agent_id ? Number(agent_id) : null;
        }

        await prisma.ticket.updateMany({
            where: { id: { in: ticketIds.map(id => Number(id)) } },
            data: updateData
        });

        // Add audit logs for each ticket
        for (const id of ticketIds) {
            let details = "";
            if (status) details += `Bulk Status: ${status}. `;
            if (agent_id !== undefined) details += agent_id ? `Bulk Assign: ${agent_id}` : "Bulk Unassign";
            
            await prisma.ticketAuditLog.create({
                data: {
                    ticket_id: Number(id),
                    user_id: req.user.id,
                    action: "Bulk Updated",
                    details
                }
            });
        }

        res.json({ message: "Tickets updated successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Bulk update failed" });
    }
});

module.exports = router;
