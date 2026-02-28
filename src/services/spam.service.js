const pool = require('../config/db');

/** 
 * Get all spam keywords with their IDs and creator info.
 * Joins with telegram_profile to get the admin's name.
 */
const getAllSpam = async () => {
    const result = await pool.query(`
        SELECT 
            s.id, 
            s.keyword, 
            s.status, 
            s.created_at, 
            s.created_by,
            s.updated_at,
            s.updated_by,
            p1.name as creator_name,
            p2.name as updater_name
        FROM spam s
        LEFT JOIN telegram_profile p1 ON s.created_by = p1.telegram_id
        LEFT JOIN telegram_profile p2 ON s.updated_by = p2.telegram_id
        ORDER BY s.created_at DESC
    `);
    return result.rows;
};

/** Add a new spam keyword. Returns the created row. */
const addSpamKeyword = async (keyword, createdBy) => {
    const normalized = keyword.toLowerCase().trim();
    try {
        const result = await pool.query(
            'INSERT INTO spam (keyword, created_by, updated_by) VALUES ($1, $2, $2) RETURNING *',
            [normalized, createdBy]
        );
        return result.rows[0];
    } catch (err) {
        if (err.code === '23505') return null; // unique_violation
        throw err;
    }
};

/** Update status of a spam keyword (Soft Delete / Deactivate) */
const updateSpamStatus = async (id, status, updatedBy) => {
    const result = await pool.query(
        'UPDATE spam SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [status, updatedBy, id]
    );
    return result.rows[0];
};

/** Bulk update status of spam keywords */
const bulkUpdateSpamStatus = async (ids, status, updatedBy) => {
    const result = await pool.query(
        'UPDATE spam SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($3) RETURNING *',
        [status, updatedBy, ids]
    );
    return result.rows;
};

module.exports = { getAllSpam, addSpamKeyword, updateSpamStatus, bulkUpdateSpamStatus };
