const pool = require('../config/db');

/**
 * Returns per-interest analytics:
 * name, is_active, subscriber_count (users with active selection)
 * Sorted by subscriber count descending.
 */
const getInterestAnalytics = async () => {
    const result = await pool.query(`
    SELECT
      i.id,
      i.name,
      i.status AS is_active,
      COUNT(ui.id) FILTER (WHERE ui.status = true) AS subscriber_count
    FROM interests i
    LEFT JOIN user_interests ui ON ui.interest_id = i.id
    GROUP BY i.id, i.name, i.status
    ORDER BY subscriber_count DESC, i.name ASC
  `);
    return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        isActive: row.is_active,
        subscriberCount: parseInt(row.subscriber_count, 10),
    }));
};

/**
 * Returns overall user statistics.
 */
const getOverviewStats = async () => {
    const [profilesResult, interestsResult, spamResult, broadcastResult] = await Promise.all([
        pool.query('SELECT COUNT(*) AS total FROM telegram_profile'),
        pool.query('SELECT COUNT(*) AS total FROM interests WHERE status = true'),
        pool.query('SELECT COUNT(*) AS total FROM spam'),
        pool.query("SELECT COUNT(*) AS total FROM scheduled_messages WHERE status = 'pending'"),
    ]);

    return {
        totalUsers: parseInt(profilesResult.rows[0].total, 10),
        activeInterests: parseInt(interestsResult.rows[0].total, 10),
        spamKeywords: parseInt(spamResult.rows[0].total, 10),
        pendingBroadcasts: parseInt(broadcastResult.rows[0].total, 10),
    };
};

module.exports = { getInterestAnalytics, getOverviewStats };
