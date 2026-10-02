const pool = require('../config/db');

let schemaMigrated = false;

// Ensure database schema supports string admin IDs and required fields
const ensureSchema = async () => {
    if (schemaMigrated) return;
    try {
        await pool.query(`
            ALTER TABLE admin ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
            ALTER TABLE admin ADD COLUMN IF NOT EXISTS password VARCHAR(255);
            ALTER TABLE admin ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE admin ADD COLUMN IF NOT EXISTS role_id INT;
        `);
        schemaMigrated = true;
        console.log('[Admin Service] admin table schema verified/migrated for string IDs & role_id.');
    } catch (e) {
        console.warn('[Admin Service] Schema migration check warning:', e.message);
    }
};

// Trigger immediately on load
ensureSchema();

/**
 * List all admins with pagination, search, and status filter.
 * Joins with telegram_profile to fetch admin's name.
 */
const listAdmins = async ({ search = '', status = 'all', role_id, page = 1, limit = 20 } = {}) => {
    await ensureSchema();

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search && search.trim() !== '') {
        const searchParam = `%${search.trim()}%`;
        params.push(searchParam);
        conditions.push(`(a.id::TEXT ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`);
        paramIndex++;
    }

    if (status === 'active') {
        conditions.push('a.status = true');
    } else if (status === 'inactive') {
        conditions.push('a.status = false');
    }

    if (role_id !== undefined && role_id !== null && role_id !== '' && role_id !== 'all') {
        const parsedRoleId = parseInt(role_id, 10);
        if (!isNaN(parsedRoleId)) {
            params.push(parsedRoleId);
            conditions.push(`(a.role_id = $${paramIndex} OR (a.role_id IS NULL AND (SELECT id FROM roles WHERE is_system = true OR name = 'Super Admin' LIMIT 1) = $${paramIndex}))`);
            paramIndex++;
        }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
        SELECT 
            a.id::TEXT AS id,
            a.status,
            a.created_at,
            a.updated_at,
            a.role_id,
            COALESCE(r.name, 'Super Admin') AS role_name,
            p.name
        FROM admin a
        LEFT JOIN telegram_profile p ON p.telegram_id::TEXT = a.id::TEXT
        LEFT JOIN roles r ON r.id = a.role_id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
        SELECT COUNT(a.id) AS total
        FROM admin a
        LEFT JOIN telegram_profile p ON p.telegram_id::TEXT = a.id::TEXT
        ${whereClause}
    `;

    const queryParams = [...params, limit, offset];
    const [result, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].total, 10) || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
        admins: result.rows,
        total,
        page,
        limit,
        totalPages,
    };
};

/**
 * Create a new admin.
 */
const createAdmin = async ({ id, password, status = true, role_id }) => {
    await ensureSchema();

    const cleanId = String(id).trim();
    const existing = await pool.query('SELECT id FROM admin WHERE id::TEXT = $1', [cleanId]);
    if (existing.rows.length > 0) {
        const err = new Error('Admin with this ID already exists.');
        err.statusCode = 409;
        throw err;
    }

    let assignedRoleId = role_id;
    if (!assignedRoleId) {
        const defaultRole = await pool.query("SELECT id FROM roles WHERE is_system = true OR name = 'Super Admin' LIMIT 1");
        assignedRoleId = defaultRole.rows[0]?.id || 1;
    }

    const result = await pool.query(`
        INSERT INTO admin (id, password, status, role_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id::TEXT AS id, status, role_id, created_at, updated_at
    `, [cleanId, password, status, assignedRoleId]);

    const admin = result.rows[0];
    const roleInfo = await pool.query('SELECT name FROM roles WHERE id = $1', [admin.role_id]);
    admin.role_name = roleInfo.rows[0]?.name || 'Super Admin';

    return admin;
};

/**
 * Update admin details (e.g. ID, status, role_id).
 */
const updateAdmin = async (id, { newId, status, role_id }) => {
    await ensureSchema();

    const cleanId = String(id).trim();
    const existing = await pool.query('SELECT id, status, role_id FROM admin WHERE id::TEXT = $1', [cleanId]);
    if (existing.rows.length === 0) {
        const err = new Error('Admin not found.');
        err.statusCode = 404;
        throw err;
    }

    const current = existing.rows[0];
    const targetId = (newId !== undefined && newId !== null && String(newId).trim() !== cleanId)
        ? String(newId).trim()
        : cleanId;

    if (targetId !== cleanId) {
        const conflict = await pool.query('SELECT id FROM admin WHERE id::TEXT = $1', [targetId]);
        if (conflict.rows.length > 0) {
            const err = new Error('Admin with the specified new ID already exists.');
            err.statusCode = 409;
            throw err;
        }
    }

    const updateStatus = status !== undefined ? status : current.status;
    const updateRoleId = role_id !== undefined ? role_id : current.role_id;

    const result = await pool.query(`
        UPDATE admin 
        SET id = $1, status = $2, role_id = $3, updated_at = NOW()
        WHERE id::TEXT = $4
        RETURNING id::TEXT AS id, status, role_id, created_at, updated_at
    `, [targetId, updateStatus, updateRoleId, cleanId]);

    const updated = result.rows[0];
    const roleInfo = await pool.query('SELECT name FROM roles WHERE id = $1', [updated.role_id]);
    updated.role_name = roleInfo.rows[0]?.name || 'Super Admin';

    return updated;
};

/**
 * Toggle admin active/inactive status.
 */
const toggleAdminStatus = async (id, status) => {
    await ensureSchema();

    const cleanId = String(id).trim();
    const result = await pool.query(`
        UPDATE admin 
        SET status = $1, updated_at = NOW()
        WHERE id::TEXT = $2
        RETURNING id::TEXT AS id, status, created_at, updated_at
    `, [status, cleanId]);

    if (result.rows.length === 0) {
        const err = new Error('Admin not found.');
        err.statusCode = 404;
        throw err;
    }

    return result.rows[0];
};

/**
 * Change admin password.
 */
const changeAdminPassword = async (id, newPassword) => {
    await ensureSchema();

    const cleanId = String(id).trim();
    const result = await pool.query(`
        UPDATE admin 
        SET password = $1, updated_at = NOW()
        WHERE id::TEXT = $2
        RETURNING id::TEXT AS id, status, created_at, updated_at
    `, [newPassword, cleanId]);

    if (result.rows.length === 0) {
        const err = new Error('Admin not found.');
        err.statusCode = 404;
        throw err;
    }

    return result.rows[0];
};

/**
 * Delete an admin.
 */
const deleteAdmin = async (id) => {
    await ensureSchema();

    const cleanId = String(id).trim();
    const result = await pool.query(`
        DELETE FROM admin 
        WHERE id::TEXT = $1
        RETURNING id::TEXT AS id
    `, [cleanId]);

    if (result.rows.length === 0) {
        const err = new Error('Admin not found.');
        err.statusCode = 404;
        throw err;
    }

    return result.rows[0];
};

/**
 * Check if a given admin ID belongs to a Super Admin account.
 * (e.g. role_id is NULL, or role is system, or role name contains 'super')
 */
const isSuperAdminAccount = async (adminId) => {
    if (!adminId) return false;
    await ensureSchema();
    const cleanId = String(adminId).trim();
    const res = await pool.query(`
        SELECT a.id, a.role_id, r.name AS role_name, r.is_system
        FROM admin a
        LEFT JOIN roles r ON r.id = a.role_id
        WHERE a.id::TEXT = $1
    `, [cleanId]);
    if (res.rows.length === 0) return false;
    const row = res.rows[0];
    if (row.role_id === null) return true;
    if (row.is_system === true) return true;
    if (row.role_name && row.role_name.toLowerCase().includes('super')) return true;
    return false;
};

/**
 * Check if a role ID corresponds to a Super Admin role.
 */
const isSuperAdminRole = async (roleId) => {
    if (roleId === undefined || roleId === null) return true;
    await ensureSchema();
    const res = await pool.query('SELECT name, is_system FROM roles WHERE id = $1', [roleId]);
    if (res.rows.length === 0) return false;
    const r = res.rows[0];
    return r.is_system === true || (r.name && r.name.toLowerCase().includes('super'));
};

module.exports = {
    listAdmins,
    createAdmin,
    updateAdmin,
    toggleAdminStatus,
    changeAdminPassword,
    deleteAdmin,
    isSuperAdminAccount,
    isSuperAdminRole,
};
