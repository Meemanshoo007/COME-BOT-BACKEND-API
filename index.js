require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { apiLimiter } = require("./src/middleware/rateLimiter");

// Route imports
const authRoutes = require("./src/routes/auth.routes");
const setupRoutes = require("./src/routes/setup.routes");
const configRoutes = require("./src/routes/config.routes");
const spamRoutes = require("./src/routes/spam.routes");
const interestRoutes = require("./src/routes/interest.routes");
const analyticsRoutes = require("./src/routes/analytics.routes");
const broadcastRoutes = require("./src/routes/broadcast.routes");
const pollRoutes = require("./src/routes/poll.routes");
const groupRoutes = require("./src/routes/group.routes");
const userRoutes = require("./src/routes/user.routes");
const { version } = require("joi");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Vercel's proxy for rate limiting
app.set("trust proxy", 1);

// ─── Simple Request Logger (For Debugging) ────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins in non-production for easier debugging
      if (process.env.NODE_ENV !== "production" || !origin) {
        return callback(null, true);
      }

      const allowedOrigins = [
        process.env.CORS_ORIGIN,
        "https://vbfb-d6161.web.app",
        "https://come-bot-admin.web.app",
      ].filter(Boolean);

      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:")
      ) {
        callback(null, true);
      } else {
        console.log(`[CORS Blocked] Origin: ${origin}`);
        callback(new Error(`CORS policy: origin ${origin} not allowed.`));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  }),
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false }));

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    // const pool = require("./src/config/db");
    // const result = await pool.query(`
    //   SELECT column_name, data_type, is_nullable
    //   FROM information_schema.columns
    //   WHERE table_name = 'admin'
    //   ORDER BY ordinal_position
    // `);
    res.status(200).json({
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      // admin_table_columns: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Database Setup (Run once after deployment) ──────────────────────────────
app.use("/api/setup-db", setupRoutes);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/config", configRoutes);
app.use("/spam", spamRoutes);
app.use("/interests", interestRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/broadcast", broadcastRoutes);
app.use("/polls", pollRoutes);
app.use("/groups", groupRoutes);
app.use("/users", userRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Server Error]", err.message);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`✅ COME Backend running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

module.exports = app;
