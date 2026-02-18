const express = require('express');
const router = express.Router();
const { getUnreadNotifications, markAsRead } = require('../services/notificationService');
const { verifyToken } = require('../middleware/auth'); // Assuming this exists

// GET /api/notifications - Get unread for current user's role
router.get('/', verifyToken, async (req, res) => {
    try {
        // Assume req.user.rol exists from token
        const role = req.user.rol || 'seller';
        // Map 'manager' to 'admin' if needed, or keep distinct
        // For now, let's assume 'manager' can see 'admin' notifications or we use exact match
        const targetRole = role.toLowerCase() === 'manager' ? 'admin' : role.toLowerCase();

        const notifs = await getUnreadNotifications(targetRole);
        res.json({ success: true, data: notifs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        await markAsRead(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
