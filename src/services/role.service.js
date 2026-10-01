const pool = require('../config/db');

let schemaMigrated = false;

const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    description: 'Unrestricted full access across all capabilities, data, and settings.',
    permissions: JSON.stringify(['*']),
    is_system: true,
    status: true,
  },
  {
    name: 'Community Moderator',
    description: 'Moderates user accounts, inspects spam activity, and manages spam rate limits.',
    permissions: JSON.stringify([
      'dashboard.view',
      'polls.view',
      'polls.create',
      'users.view',
      'users.manage_xp',
      'spam.view',
      'spam.manage',
      'groups.view',
      'config.view',
      'config.spam_limit',
      'config.mute_duration',
      'config.maintenance_mode',
    ]),
    is_system: false,
    status: true,
  },
  {
    name: 'Content & Broadcast Lead',
    description: 'Creates announcements, promotional broadcasts, and manages maintenance messages.',
    permissions: JSON.stringify([
      'dashboard.view',
      'broadcasts.view',
      'broadcasts.create',
      'broadcasts.cancel',
      'polls.view',
      'polls.create',
      'interests.view',
      'config.view',
      'config.maintenance_message',
    ]),
    is_system: false,
    status: true,
  },
  {
    name: 'Customer Support Specialist',
    description: 'Assists end-users, monitors user inquiries, and views bot settings.',
    permissions: JSON.stringify([
      'dashboard.view',
      'users.view',
      'users.export',
      'interests.view',
      'interests.manage',
      'config.view',
    ]),
    is_system: false,
    status: true,
  },
  {
    name: 'Security Auditor',
    description: 'Audit logs, review admin access, inspect bot behavior and analytics without modification rights.',
    permissions: JSON.stringify([
      'dashboard.view',
      'broadcasts.view',
      'polls.view',
      'users.view',
      'spam.view',
      'interests.view',
      'groups.view',
      'admins.view',
      'roles.view',
      'config.view',
    ]),
    is_system: false,
    status: true,
  },
];

const ensureSchema = async () => {
  if (schemaMigrated) return;
  try {
    // 1. Create roles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        permissions JSONB DEFAULT '[]'::jsonb,
        is_system BOOLEAN DEFAULT FALSE,
        status BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add role_id foreign key column to admin table
    await pool.query(`
      ALTER TABLE admin ADD COLUMN IF NOT EXISTS role_id INT;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_admin_role'
        ) THEN
          ALTER TABLE admin ADD CONSTRAINT fk_admin_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 3. Seed default roles if not present
    for (const r of DEFAULT_ROLES) {
      await pool.query(`
        INSERT INTO roles (name, description, permissions, is_system, status, created_at, updated_at)
        VALUES ($1, $2, $3::jsonb, $4, $5, NOW(), NOW())
        ON CONFLICT (name) DO NOTHING;
      `, [r.name, r.description, r.permissions, r.is_system, r.status]);
    }

    // 4. Default any existing admins without a role to Super Admin
    await pool.query(`
      UPDATE admin 
      SET role_id = (SELECT id FROM roles WHERE is_system = true OR name = 'Super Admin' LIMIT 1)
      WHERE role_id IS NULL;
    `);

    schemaMigrated = true;
    console.log('[Role Service] roles table & foreign keys verified/seeded successfully.');
  } catch (e) {
    console.warn('[Role Service] Schema migration check warning:', e.message);
  }
};

// Auto-run schema check
ensureSchema();

/**
 * List roles with admin count and optional search / status filtering.
 */
const listRoles = async ({ search = '', status = 'all' } = {}) => {
  await ensureSchema();

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (search && search.trim() !== '') {
    params.push(`%${search.trim()}%`);
    conditions.push(`(r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`);
    paramIndex++;
  }

  if (status === 'active') {
    conditions.push('r.status = true');
  } else if (status === 'inactive') {
    conditions.push('r.status = false');
  } else if (status === 'system') {
    conditions.push('r.is_system = true');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      r.id,
      r.name,
      r.description,
      r.permissions,
      r.is_system,
      r.status,
      r.created_at,
      r.updated_at,
      COUNT(a.id)::INT AS member_count
    FROM roles r
    LEFT JOIN admin a ON a.role_id = r.id
    ${whereClause}
    GROUP BY r.id
    ORDER BY r.is_system DESC, r.id ASC
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Get role by ID.
 */
const getRoleById = async (id) => {
  await ensureSchema();

  const result = await pool.query(`
    SELECT 
      r.id,
      r.name,
      r.description,
      r.permissions,
      r.is_system,
      r.status,
      r.created_at,
      r.updated_at,
      COUNT(a.id)::INT AS member_count
    FROM roles r
    LEFT JOIN admin a ON a.role_id = r.id
    WHERE r.id = $1
    GROUP BY r.id
  `, [id]);

  if (result.rows.length === 0) {
    const err = new Error('Role not found.');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
};

/**
 * Create a new role.
 */
const createRole = async ({ name, description = '', permissions = [], status = true }) => {
  await ensureSchema();

  const cleanName = String(name).trim();
  const existing = await pool.query('SELECT id FROM roles WHERE LOWER(name) = LOWER($1)', [cleanName]);
  if (existing.rows.length > 0) {
    const err = new Error('A role with this name already exists.');
    err.statusCode = 409;
    throw err;
  }

  const result = await pool.query(`
    INSERT INTO roles (name, description, permissions, is_system, status, created_at, updated_at)
    VALUES ($1, $2, $3::jsonb, false, $4, NOW(), NOW())
    RETURNING id, name, description, permissions, is_system, status, created_at, updated_at
  `, [cleanName, description ? description.trim() : '', JSON.stringify(permissions), status]);

  const newRole = result.rows[0];
  newRole.member_count = 0;
  return newRole;
};

/**
 * Update an existing role.
 */
const updateRole = async (id, { name, description, permissions, status }) => {
  await ensureSchema();

  const existingRes = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
  if (existingRes.rows.length === 0) {
    const err = new Error('Role not found.');
    err.statusCode = 404;
    throw err;
  }

  const existing = existingRes.rows[0];

  // Protect system roles
  if (existing.is_system) {
    if (status === false) {
      const err = new Error('System roles cannot be deactivated.');
      err.statusCode = 400;
      throw err;
    }
  }

  let newName = existing.name;
  if (name !== undefined && name !== null && name.trim() !== '') {
    newName = name.trim();
    if (newName.toLowerCase() !== existing.name.toLowerCase()) {
      if (existing.is_system) {
        const err = new Error('System role names cannot be modified.');
        err.statusCode = 400;
        throw err;
      }
      const conflict = await pool.query('SELECT id FROM roles WHERE LOWER(name) = LOWER($1) AND id != $2', [newName, id]);
      if (conflict.rows.length > 0) {
        const err = new Error('A role with this name already exists.');
        err.statusCode = 409;
        throw err;
      }
    }
  }

  const newDesc = description !== undefined ? (description ? description.trim() : '') : existing.description;
  let newPerms = permissions !== undefined ? permissions : existing.permissions;
  if (existing.is_system && Array.isArray(newPerms) && !newPerms.includes('*')) {
    newPerms.push('*');
  }
  const newStatus = status !== undefined ? status : existing.status;

  const result = await pool.query(`
    UPDATE roles
    SET name = $1, description = $2, permissions = $3::jsonb, status = $4, updated_at = NOW()
    WHERE id = $5
    RETURNING id, name, description, permissions, is_system, status, created_at, updated_at
  `, [newName, newDesc, JSON.stringify(newPerms), newStatus, id]);

  const updatedRole = result.rows[0];

  // Compute member count
  const countRes = await pool.query('SELECT COUNT(id)::INT AS count FROM admin WHERE role_id = $1', [id]);
  updatedRole.member_count = countRes.rows[0]?.count || 0;

  return updatedRole;
};

/**
 * Toggle status of a role.
 */
const toggleRoleStatus = async (id, status) => {
  await ensureSchema();

  const existing = await pool.query('SELECT id, is_system FROM roles WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    const err = new Error('Role not found.');
    err.statusCode = 404;
    throw err;
  }

  if (existing.rows[0].is_system && !status) {
    const err = new Error('System roles cannot be deactivated.');
    err.statusCode = 400;
    throw err;
  }

  const result = await pool.query(`
    UPDATE roles
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, name, description, permissions, is_system, status, created_at, updated_at
  `, [status, id]);

  const role = result.rows[0];
  const countRes = await pool.query('SELECT COUNT(id)::INT AS count FROM admin WHERE role_id = $1', [id]);
  role.member_count = countRes.rows[0]?.count || 0;

  return role;
};

/**
 * Delete a role.
 */
const deleteRole = async (id) => {
  await ensureSchema();

  const existing = await pool.query('SELECT id, name, is_system FROM roles WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    const err = new Error('Role not found.');
    err.statusCode = 404;
    throw err;
  }

  if (existing.rows[0].is_system) {
    const err = new Error('System roles cannot be deleted.');
    err.statusCode = 400;
    throw err;
  }

  const memberCheck = await pool.query('SELECT COUNT(id)::INT AS count FROM admin WHERE role_id = $1', [id]);
  const memberCount = memberCheck.rows[0]?.count || 0;
  if (memberCount > 0) {
    const err = new Error(`Cannot delete role "${existing.rows[0].name}" because it is currently assigned to ${memberCount} admin account(s). Please reassign them first.`);
    err.statusCode = 400;
    throw err;
  }

  await pool.query('DELETE FROM roles WHERE id = $1', [id]);

  return { id: Number(id), name: existing.rows[0].name };
};

module.exports = {
  ensureSchema,
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  toggleRoleStatus,
  deleteRole,
};
