const pool = require('../config/db');

/** Get all users with their XP, level, interests count, and spam count */
const getAllUsers = async ({ search = '', interestIds = [], page = 1, limit = 200 } = {}) => {
    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    // Build optional multi-interest filter clause
    const hasInterestFilter = interestIds && interestIds.length > 0;
    const interestJoin = hasInterestFilter
        ? `INNER JOIN user_interests ui_f ON ui_f.telegram_id = p.telegram_id 
           AND ui_f.interest_id = ANY(ARRAY[${interestIds.map(Number).join(',')}]) 
           AND ui_f.status = true`
        : '';

    const result = await pool.query(`
        SELECT 
            p.id,
            p.name,
            p.telegram_id,
            p.come_uid,
            p.discord_id,
            p.spam_count,
            p.xp,
            p.level,
            p.created_at,
            COUNT(DISTINCT ui.id) FILTER (WHERE ui.status = true) AS interests_count
        FROM telegram_profile p
        LEFT JOIN user_interests ui ON ui.telegram_id = p.telegram_id
        ${interestJoin}
        WHERE 
            p.name ILIKE $1 OR 
            p.telegram_id::TEXT LIKE $1 OR 
            p.come_uid::TEXT LIKE $1
        GROUP BY p.id
        ORDER BY p.xp DESC
        LIMIT $2 OFFSET $3
    `, [searchParam, limit, offset]);

    const countResult = await pool.query(`
        SELECT COUNT(DISTINCT p.id) FROM telegram_profile p
        ${interestJoin}
        WHERE p.name ILIKE $1 OR p.telegram_id::TEXT LIKE $1 OR p.come_uid::TEXT LIKE $1
    `, [searchParam]);

    return {
        users: result.rows,
        total: parseInt(countResult.rows[0].count, 10),
    };
};

/** Update user XP and level */
const addXP = async (id, amount) => {
    // 1. Get current XP
    const userRes = await pool.query('SELECT xp FROM telegram_profile WHERE id = $1', [id]);
    if (userRes.rows.length === 0) return null;

    const currentXp = parseInt(userRes.rows[0].xp, 10);
    const newXp = Math.max(0, currentXp + amount);

    // 2. Calculate new level
    // Formula: Level = 1 + floor(sqrt(XP / 50))
    const newLevel = 1 + Math.floor(Math.sqrt(newXp / 50));

    // 3. Update profile
    const result = await pool.query(
        'UPDATE telegram_profile SET xp = $1, level = $2 WHERE id = $3 RETURNING *',
        [newXp, newLevel, id]
    );

    return result.rows[0];
};

module.exports = { getAllUsers, addXP };
