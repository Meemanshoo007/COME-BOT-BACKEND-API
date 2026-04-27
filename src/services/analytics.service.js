const pool = require('../config/db');

/**
 * Returns overall user statistics.
 */
const getOverviewStats = async () => {
    const [profilesResult, interestsResult, spamResult, broadcastResult, pollResult] = await Promise.all([
        pool.query('SELECT COUNT(*) AS total FROM telegram_profile'),
        pool.query('SELECT COUNT(*) AS total FROM interests WHERE status = true'),
        pool.query('SELECT COUNT(*) AS total FROM spam'),
        pool.query("SELECT COUNT(*) AS total FROM scheduled_messages WHERE status = 'pending'"),
        pool.query("SELECT COUNT(*) AS total FROM poll WHERE is_sent = false"),
    ]);

    return {
        totalUsers: parseInt(profilesResult.rows[0].total, 10),
        activeInterests: parseInt(interestsResult.rows[0].total, 10),
        spamKeywords: parseInt(spamResult.rows[0].total, 10),
        pendingBroadcasts: parseInt(broadcastResult.rows[0].total, 10),
        pendingPolls: parseInt(pollResult.rows[0].total, 10),
    };
};

module.exports = { getOverviewStats };
