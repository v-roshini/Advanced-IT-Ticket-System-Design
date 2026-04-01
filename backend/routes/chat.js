const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");

// Get contacts (people the user can chat with)
router.get("/contacts", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let contacts = [];

    if (role === "admin") {
      // Admin sees everyone
      contacts = await prisma.user.findMany({
        where: { id: { not: userId } },
        select: { id: true, full_name: true, role: true, email: true }
      });
    } else if (role === "client") {
      // Client sees admins
      const admins = await prisma.user.findMany({
        where: { role: "admin", is_active: true },
        select: { id: true, full_name: true, role: true, email: true }
      });
      contacts.push(...admins);

      // Client sees agents assigned to their tickets
      const customer = await prisma.customer.findUnique({ where: { portal_user_id: userId } });
      if (customer) {
        const assignedTickets = await prisma.ticket.findMany({
          where: { 
            customer_id: customer.id, 
            agent_id: { not: null },
            status: { not: "Closed" } // Prevent chatting if ticket is closed
          },
          select: { agent: { select: { id: true, full_name: true, role: true, email: true } } }
        });
        const assignedRenewals = await prisma.renewal.findMany({
          where: { customer_id: customer.id, assigned_agent_id: { not: null } },
          select: { assigned_agent: { select: { id: true, full_name: true, role: true, email: true } } }
        });

        const agentMap = new Map();
        assignedTickets.forEach(t => t.agent && agentMap.set(t.agent.id, t.agent));
        assignedRenewals.forEach(r => r.assigned_agent && agentMap.set(r.assigned_agent.id, r.assigned_agent));

        contacts.push(...Array.from(agentMap.values()));
      }
    } else if (role === "agent") {
      // Agent sees admins
      const admins = await prisma.user.findMany({
        where: { role: "admin", is_active: true },
        select: { id: true, full_name: true, role: true, email: true }
      });
      contacts.push(...admins);

      // Agent sees clients they are assigned to
      const assignedTickets = await prisma.ticket.findMany({
        where: { 
          agent_id: userId,
          status: { not: "Closed" } // Only show clients for active tickets
        },
        include: { customer_ref: { include: { user: { select: { id: true, full_name: true, role: true, email: true } } } } }
      });
      const assignedRenewals = await prisma.renewal.findMany({
        where: { assigned_agent_id: userId },
        include: { customer: { include: { user: { select: { id: true, full_name: true, role: true, email: true } } } } }
      });

      const clientMap = new Map();
      assignedTickets.forEach(t => t.customer_ref?.user && clientMap.set(t.customer_ref.user.id, t.customer_ref.user));
      assignedRenewals.forEach(r => r.customer?.user && clientMap.set(r.customer.user.id, r.customer.user));

      contacts.push(...Array.from(clientMap.values()));
    }

    // Deduplicate contacts
    const uniqueContacts = [];
    const seen = new Set();
    for (const c of contacts) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        uniqueContacts.push(c);
      }
    }

    res.json(uniqueContacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching contacts" });
  }
});

// Get chat history with a specific user
router.get("/:contactId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId);

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { sender_id: userId, receiver_id: contactId },
          { sender_id: contactId, receiver_id: userId }
        ]
      },
      orderBy: { created_at: "asc" }
    });

    // Mark as read
    await prisma.chatMessage.updateMany({
      where: { sender_id: contactId, receiver_id: userId, is_read: false },
      data: { is_read: true }
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages: " + err.message, error: String(err) });
  }
});

// Send a message
router.post("/:contactId", verifyToken, async (req, res) => {
  try {
    const sender_id = req.user.id;
    const receiver_id = parseInt(req.params.contactId);
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message cannot be empty." });
    }

    const chatMsg = await prisma.chatMessage.create({
      data: {
        sender_id,
        receiver_id,
        message: message.trim()
      }
    });

    // Fetch sender info for notification title
    const sender = await prisma.user.findUnique({
      where: { id: sender_id },
      select: { full_name: true }
    });

    // Create Notification for the receiver
    const notification = await prisma.notification.create({
      data: {
        user_id: receiver_id,
        type: "new_message",
        title: `New Message from ${sender.full_name}`,
        message: message.trim(),
        link: "/chat" // Redirects to Chat component
      }
    });

    // Emit via socket
    if (global.io) {
      // Send chat to receiver
      global.io.to(`user_${receiver_id}`).emit("chat_message", chatMsg);
      // Also to sender (to sync multiple devices)
      global.io.to(`user_${sender_id}`).emit("chat_message", chatMsg);

      // ** Emit Real-Time Notification to Receiver **
      global.io.to(`user_${receiver_id}`).emit("notification", notification);
    }

    res.json(chatMsg);
  } catch (err) {
    res.status(500).json({ message: "Error sending message: " + err.message, error: String(err) });
  }
});

// Admin-only: View all chat history across the system
router.get("/admin/all", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const messages = await prisma.chatMessage.findMany({
      orderBy: { created_at: "desc" },
      take: 200,
      include: {
        sender: { select: { id: true, full_name: true, role: true } },
        receiver: { select: { id: true, full_name: true, role: true } }
      }
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching all chats" });
  }
});

module.exports = router;
