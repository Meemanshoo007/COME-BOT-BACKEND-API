const pool = require('../config/db');

/** Get all interests (admin view: all; user view: active only) */
const getAllInterests = async (adminView = true) => {
    const query = adminView
        ? `SELECT 
            i.id, 
            i.name, 
            i.status, 
            i.created_at, 
            i.created_by,
            i.updated_at,
            i.updated_by,
            p1.name as creator_name,
            p2.name as updater_name,
            (SELECT COUNT(*) FROM user_interests ui WHERE ui.interest_id = i.id AND ui.status = TRUE) as user_count
          FROM interests i
          LEFT JOIN telegram_profile p1 ON i.created_by = p1.telegram_id
          LEFT JOIN telegram_profile p2 ON i.updated_by = p2.telegram_id
          ORDER BY i.name ASC`
        : `SELECT 
            i.id, 
            i.name, 
            i.status, 
            (SELECT COUNT(*) FROM user_interests ui WHERE ui.interest_id = i.id AND ui.status = TRUE) as user_count,
            i.created_at, 
            i.updated_at 
          FROM interests i 
          WHERE i.status = true 
          ORDER BY i.name ASC`;
    const result = await pool.query(query);
    return result.rows;
};

/** Add a new interest. Returns created row or null if duplicate. */
const addInterest = async (name, createdBy) => {
    const trimmed = name.trim();
    try {
        const result = await pool.query(
            'INSERT INTO interests (name, status, created_by, updated_by) VALUES ($1, true, $2, $2) RETURNING *',
            [trimmed, createdBy]
        );
        return result.rows[0];
    } catch (err) {
        if (err.code === '23505') return null;
        throw err;
    }
};

/** Toggle the global status (active/inactive) of an interest */
const updateInterestStatus = async (id, status, updatedBy) => {
    const result = await pool.query(
        `UPDATE interests
         SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [status, updatedBy, id]
    );
    return result.rows[0] || null;
};

/** Bulk update status of interests */
const bulkUpdateInterestStatus = async (ids, status, updatedBy) => {
    const result = await pool.query(
        'UPDATE interests SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($3) RETURNING *',
        [status, updatedBy, ids]
    );
    return result.rows;
};

module.exports = { getAllInterests, addInterest, updateInterestStatus, bulkUpdateInterestStatus };
