const { loginAdmin, getAdminProfile } = require("../services/auth.service");
const { loginSchema } = require("../validators/schemas");

const login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }

  try {
    const result = await loginAdmin(value.id, value.password);
    return res.status(200).json({
      success: true,
      token: result.token,
      admin: result.admin,
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (statusCode < 500) {
      return res.status(statusCode).json({
        success: false,
        message: err.message,
      });
    }
    console.error("[Auth] Login error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const getMe = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const profile = await getAdminProfile(adminId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Admin account not found or deactivated." });
    }

    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (statusCode < 500) {
      return res.status(statusCode).json({ success: false, message: err.message });
    }
    console.error("[Auth] getMe error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = { login, getMe };
