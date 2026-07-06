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

/**
 * Returns user join rates grouped by daily, weekly, or monthly intervals.
 */
const getUserJoinStats = async ({ interval = 'weekly' } = {}) => {
    let truncUnit = 'week';
    let stepInterval = '1 week';
    let rangeInterval = '11 weeks';

    if (interval === 'daily') {
        truncUnit = 'day';
        stepInterval = '1 day';
        rangeInterval = '29 days';
    } else if (interval === 'monthly') {
        truncUnit = 'month';
        stepInterval = '1 month';
        rangeInterval = '11 months';
    } else if (interval === 'yearly') {
        truncUnit = 'year';
        stepInterval = '1 year';
        rangeInterval = '4 years';
    }

    const query = `
        SELECT 
            series.period AS period,
            COALESCE(COUNT(p.id), 0)::INT AS count
        FROM (
            SELECT GENERATE_SERIES(
                DATE_TRUNC($1, NOW() - CAST($2 AS INTERVAL)),
                DATE_TRUNC($1, NOW()),
                CAST($3 AS INTERVAL)
            ) AS period
        ) series
        LEFT JOIN telegram_profile p 
            ON DATE_TRUNC($1, p.created_at) = series.period
        GROUP BY series.period
        ORDER BY series.period ASC;
    `;

    const result = await pool.query(query, [truncUnit, rangeInterval, stepInterval]);
    return result.rows;
};

module.exports = { getOverviewStats, getUserJoinStats };
