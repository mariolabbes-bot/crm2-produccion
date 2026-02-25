const pool = require('../db');

/**
 * Creates a new notification in the database.
 * @param {Object} params
 * @param {string} params.userRole - Target role (e.g. 'admin', 'manager', 'all')
 * @param {string} params.type - 'info', 'success', 'warning', 'error'
 * @param {string} params.title - Short title
 * @param {string} params.message - Detailed body
 */
async function createNotification({ userRole = 'admin', type = 'info', title, message }) {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO app_notifications (user_role, type, title, message)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const res = await client.query(query, [userRole, type, title, message]);
        return res.rows[0];
    } catch (err) {
        console.error('Error creating notification:', err);
        return null; // Fail silently to not break main flow
    } finally {
        client.release();
    }
}

/**
 * Get unread notifications for a specific role.
 * @param {string} role 
 */
async function getUnreadNotifications(role = 'admin') {
    const client = await pool.connect();
    try {
        const query = `
            SELECT * FROM app_notifications 
            WHERE (user_role = $1 OR user_role = 'all') 
            AND read = false 
            ORDER BY created_at DESC
            LIMIT 50
        `;
        const res = await client.query(query, [role]);
        return res.rows;
    } catch (err) {
        console.error('Error fetching notifications:', err);
        return [];
    } finally {
        client.release();
    }
}

/**
 * Mark a notification as read.
 * @param {number} id 
 */
async function markAsRead(id) {
    const client = await pool.connect();
    try {
        await client.query('UPDATE app_notifications SET read = true WHERE id = $1', [id]);
        return true;
    } catch (err) {
        console.error('Error marking notification read:', err);
        return false;
    } finally {
        client.release();
    }
}

module.exports = { createNotification, getUnreadNotifications, markAsRead };
