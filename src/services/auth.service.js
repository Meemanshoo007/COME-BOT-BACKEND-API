const jwt = require("jsonwebtoken");
const pool = require("../config/db");

/**
 * Validates admin credentials and returns JWT token + admin profile with assigned role and permissions.
 * Fails login if the admin account is inactive or if the assigned role is inactive.
 *
 * @param {string|number} id - The admin's ID
 * @param {string} password - The admin's password
 * @returns {{ token: string, admin: object }}
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
      r.id AS joined_role_id,
      r.status AS role_table_status,
      COALESCE(r.name, 'Super Admin') AS role_name,
      COALESCE(r.permissions, '["*"]'::jsonb) AS permissions,
      p.name
    FROM admin a
    LEFT JOIN roles r ON r.id = a.role_id
    LEFT JOIN telegram_profile p ON p.telegram_id::TEXT = a.id::TEXT
    WHERE a.id::TEXT = $1
  `, [adminId]);

  if (result.rows.length === 0) {
    const err = new Error("Invalid credentials or unauthorized admin.");
    err.statusCode = 401;
    throw err;
  }

  const admin = result.rows[0];

  if (password !== admin.password) {
    const err = new Error("Invalid credentials.");
    err.statusCode = 401;
    throw err;
  }

  if (!admin.status) {
    const err = new Error("Admin account is deactivated. Please contact a Super Admin.");
    err.statusCode = 403;
    throw err;
  }

  // Check role active status
  if (admin.role_id) {
    if (!admin.joined_role_id) {
      const err = new Error("Login failed: The role assigned to your account no longer exists. Please contact a Super Admin.");
      err.statusCode = 403;
      throw err;
    }

    if (admin.role_table_status === false) {
      const err = new Error(`Login failed: Assigned role "${admin.role_name}" is currently inactive. An active role is required to login.`);
      err.statusCode = 403;
      throw err;
    }
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
 * Rejects if the admin account or assigned role is inactive.
 */
const getAdminProfile = async (id) => {
  const adminId = String(id).trim();
  const result = await pool.query(`
    SELECT 
      a.id::TEXT AS id, 
      a.status, 
      a.role_id,
      r.id AS joined_role_id,
      r.status AS role_table_status,
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
  if (!admin.status) {
    const err = new Error("Admin account is deactivated.");
    err.statusCode = 403;
    throw err;
  }

  if (admin.role_id) {
    if (!admin.joined_role_id) {
      const err = new Error("The role assigned to your account no longer exists.");
      err.statusCode = 403;
      throw err;
    }

    if (admin.role_table_status === false) {
      const err = new Error(`Your assigned role ("${admin.role_name}") is currently inactive.`);
      err.statusCode = 403;
      throw err;
    }
  }

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
