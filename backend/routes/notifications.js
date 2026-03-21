const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { verifyToken } = require("../middleware/authMiddleware");

// GET current user's notifications (last 50)
router.get("/", verifyToken, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: "desc" },
            take: 50
        });

        // Count unread
        const unreadCount = await prisma.notification.count({
            where: { user_id: req.user.id, is_read: false }
        });

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching notifications" });
    }
});

// PATCH mark single notification as read
router.patch("/:id/read", verifyToken, async (req, res) => {
    try {
        await prisma.notification.update({
            where: { id: Number(req.params.id), user_id: req.user.id },
            data: { is_read: true }
        });
        res.json({ message: "Notification marked as read" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating notification" });
    }
});

// PATCH mark all notifications as read
router.patch("/read-all", verifyToken, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { user_id: req.user.id, is_read: false },
            data: { is_read: true }
        });
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating notifications" });
    }
});

module.exports = router;
