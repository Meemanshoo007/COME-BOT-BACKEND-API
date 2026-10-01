const jwt = require("jsonwebtoken");
const pool = require("../config/db");

/**
 * Validates admin credentials and returns JWT token + admin profile with assigned role and permissions.
 *
 * @param {string|number} id - The admin's ID
 * @param {string} password - The admin's password
 * @returns {{ token: string, admin: object } | null}
 */
const loginAdmin = async (id, password) => {
  const adminId = String(id).trim();

  // Query admin joined with roles and telegram_profile
  const result = await pool.query(`
    SELECT 
      a.id::TEXT AS id, 
      a.status, 
      a.password,
      a.role_id,
      COALESCE(r.name, 'Super Admin') AS role_name,
      COALESCE(r.permissions, '["*"]'::jsonb) AS permissions,
      COALESCE(r.status, true) AS role_status,
      p.name
    FROM admin a
    LEFT JOIN roles r ON r.id = a.role_id
    LEFT JOIN telegram_profile p ON p.telegram_id::TEXT = a.id::TEXT
    WHERE a.id::TEXT = $1
  `, [adminId]);

  if (result.rows.length === 0) {
    return null;
  }

  const admin = result.rows[0];
  if (!admin.status) {
    return null; // Admin is deactivated
  }

  if (password !== admin.password) {
    return null;
  }

  // Parse permissions
  let permissions = ['*'];
  try {
    if (Array.isArray(admin.permissions)) {
      permissions = admin.permissions;
    } else if (typeof admin.permissions === 'string') {
      permissions = JSON.parse(admin.permissions);
    }
  } catch (e) {
    permissions = ['*'];
  }

  // Sign JWT
  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  return {
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      role_id: admin.role_id,
      role_name: admin.role_name,
      permissions,
    },
  };
};

/**
 * Retrieve current admin profile with role details by admin ID.
 */
const getAdminProfile = async (id) => {
  const adminId = String(id).trim();
  const result = await pool.query(`
    SELECT 
      a.id::TEXT AS id, 
      a.status, 
      a.role_id,
      COALESCE(r.name, 'Super Admin') AS role_name,
      COALESCE(r.permissions, '["*"]'::jsonb) AS permissions,
      r.is_system,
      p.name
    FROM admin a
    LEFT JOIN roles r ON r.id = a.role_id
    LEFT JOIN telegram_profile p ON p.telegram_id::TEXT = a.id::TEXT
    WHERE a.id::TEXT = $1
  `, [adminId]);

  if (result.rows.length === 0) return null;
  const admin = result.rows[0];
  if (!admin.status) return null;

  let permissions = ['*'];
  try {
    if (Array.isArray(admin.permissions)) {
      permissions = admin.permissions;
    } else if (typeof admin.permissions === 'string') {
      permissions = JSON.parse(admin.permissions);
    }
  } catch (e) {
    permissions = ['*'];
  }

  return {
    id: admin.id,
    name: admin.name,
    role_id: admin.role_id,
    role_name: admin.role_name,
    permissions,
    is_system: admin.is_system || false,
  };
};

module.exports = { loginAdmin, getAdminProfile };
