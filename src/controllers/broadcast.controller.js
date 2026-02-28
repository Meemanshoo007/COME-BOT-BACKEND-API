const {
    getAllBroadcasts,
    createBroadcast,
    cancelBroadcast,
    getBroadcastLogs,
    retryBroadcastForUser,
    getBroadcastTargetUsers,
} = require('../services/broadcast.service');
const { broadcastCreateSchema } = require('../validators/schemas');

const listBroadcasts = async (req, res) => {
    try {
        const data = await getAllBroadcasts();
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Broadcast] List error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch broadcasts.' });
    }
};

const scheduleBroadcast = async (req, res) => {
    const { error, value } = broadcastCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }
    try {
        const result = await createBroadcast(
            value.message_text,
            value.interest_ids,
            value.scheduled_time,
            req.admin.telegram_id
        );
        return res.status(201).json({ success: true, data: result });
    } catch (err) {
        console.error('[Broadcast] Create error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to schedule broadcast.' });
    }
};

/** Soft-delete (cancel) a pending broadcast */
const softCancelBroadcast = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    try {
        const cancelled = await cancelBroadcast(id);
        if (!cancelled) {
            return res.status(404).json({
                success: false,
                message: 'Broadcast not found, already sent, or already cancelled.',
            });
        }
        return res.status(200).json({ success: true, message: 'Broadcast cancelled.' });
    } catch (err) {
        console.error('[Broadcast] Cancel error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to cancel broadcast.' });
    }
};

const broadcastLogs = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    try {
        const data = await getBroadcastLogs(id);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Broadcast] Logs error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch broadcast logs.' });
    }
};

/** Retry delivery to a single failed user */
const retryUser = async (req, res) => {
    const broadcastId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(broadcastId) || isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid IDs.' });
    }
    try {
        const result = await retryBroadcastForUser(broadcastId, userId);
        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Message sent successfully.',
                data: result
            });
        } else {
            return res.status(200).json({
                success: false,
                message: result.error || 'Failed to send message.',
                data: result
            });
        }
    } catch (err) {
        console.error('[Broadcast] Retry user error:', err.message);
        return res.status(500).json({ success: false, message: 'Server error during retry.' });
    }
};

/** Retry delivery to ALL failed users for a broadcast */
const retryAllFailed = async (req, res) => {
    const broadcastId = parseInt(req.params.id, 10);
    if (isNaN(broadcastId)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    try {
        const pool = require('../config/db');
        // Remove all failed logs so bot re-sends to them
        await pool.query(
            `DELETE FROM broadcast_logs WHERE scheduled_message_id = $1 AND status = 'failed'`,
            [broadcastId]
        );
        // Reset broadcast to pending so poller picks it up
        await pool.query(
            `UPDATE scheduled_messages SET status = 'pending' WHERE id = $1`,
            [broadcastId]
        );
        return res.status(200).json({ success: true, message: 'All failed users queued for retry.' });
    } catch (err) {
        console.error('[Broadcast] Retry all error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to queue retries.' });
    }
};

const getBroadcastTargets = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    try {
        const data = await getBroadcastTargetUsers(id);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Broadcast] Target users error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch target users.' });
    }
};

module.exports = {
    listBroadcasts,
    scheduleBroadcast,
    softCancelBroadcast,
    broadcastLogs,
    retryUser,
    retryAllFailed,
    getBroadcastTargets,
};
