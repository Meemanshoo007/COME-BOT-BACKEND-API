const pool = require('../config/db');

const getAllGroups = async () => {
    const result = await pool.query(`
        SELECT 
            g.id, 
            g.group_id, 
            g.group_name, 
            g.status, 
            g.created_at, 
            g.updated_at,
            g.updated_by,
            COALESCE(a.id, p2.name, g.updated_by) as updater_name
        FROM allowed_groups g
        LEFT JOIN admin a ON a.id::TEXT = g.updated_by::TEXT
        LEFT JOIN telegram_profile p2 ON g.updated_by::TEXT = p2.telegram_id::TEXT
        ORDER BY g.created_at DESC
    `);
    return result.rows;
};

/** Add a new allowed group */
const addAllowedGroup = async (groupId, groupName) => {
    try {
        const result = await pool.query(
            'INSERT INTO allowed_groups (group_id, group_name) VALUES ($1, $2) RETURNING *',
            [groupId, groupName]
        );
        return result.rows[0];
    } catch (err) {
        if (err.code === '23505') return null; // unique_violation
        throw err;
    }
};

/** Update status of an allowed group */
const updateGroupStatus = async (id, status, updatedBy) => {
    const result = await pool.query(
        'UPDATE allowed_groups SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [status, updatedBy, id]
    );
    return result.rows[0];
};

/** Bulk update status */
const bulkUpdateGroupStatus = async (ids, status, updatedBy) => {
    const result = await pool.query(
        'UPDATE allowed_groups SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($3) RETURNING *',
        [status, updatedBy, ids]
    );
    return result.rows;
};

module.exports = { getAllGroups, addAllowedGroup, updateGroupStatus, bulkUpdateGroupStatus };
