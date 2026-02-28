const { loginAdmin } = require("../services/auth.service");
const { loginSchema } = require("../validators/schemas");

const login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }

  try {
    const result = await loginAdmin(value.telegram_id, value.secret);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or unauthorized admin.",
      });
    }
    return res.status(200).json({ success: true, token: result.token });
  } catch (err) {
    console.error("[Auth] Login error:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

module.exports = { login };
