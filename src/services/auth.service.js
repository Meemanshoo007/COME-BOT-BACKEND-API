const jwt = require("jsonwebtoken");
const pool = require("../config/db");

/**
 * Validates admin credentials.
 * Admin must exist in the `admin` table with status=true
 * AND provide the correct password from the database.
 *
 * @param {number} id - The admin's ID
 * @param {string} password - The admin's password
 * @returns {{ token: string } | null}
 */
const loginAdmin = async (id, password) => {
  // 1. Check ADMIN_SECRET
  console.log("Received ID:", id);
  console.log("Received password:", password);


  // 2. Check admin table
  const result = await pool.query(
    "SELECT id, status, password FROM admin WHERE id = $1",
    [id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const admin = result.rows[0];
  if (!admin.status) {
    return null; // Admin is deactivated
  }

  console.log("Expected password:", admin.password);
  if (password !== admin.password) {
    return null;
  }

  // 3. Sign JWT
  const token = jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  return { token };
};

module.exports = { loginAdmin };
