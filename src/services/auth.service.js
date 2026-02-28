const jwt = require("jsonwebtoken");
const pool = require("../config/db");

/**
 * Validates admin credentials.
 * Admin must exist in the `admin` table with status=true
 * AND provide the correct ADMIN_SECRET from environment.
 *
 * @param {number} telegramId - The admin's Telegram ID
 * @param {string} secret - The shared admin secret
 * @returns {{ token: string } | null}
 */
const loginAdmin = async (telegramId, secret) => {
  // 1. Check ADMIN_SECRET
  console.log(secret !== process.env.ADMIN_SECRET);
  if (secret !== process.env.ADMIN_SECRET) {
    return null;
  }

  // 2. Check admin table
  const result = await pool.query(
    "SELECT id, status FROM admin WHERE id = $1",
    [telegramId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const admin = result.rows[0];
  if (!admin.status) {
    return null; // Admin is deactivated
  }

  // 3. Sign JWT
  const token = jwt.sign({ telegram_id: telegramId }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  return { token };
};

module.exports = { loginAdmin };
