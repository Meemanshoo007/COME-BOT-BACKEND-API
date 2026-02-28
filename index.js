require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { apiLimiter } = require("./src/middleware/rateLimiter");

// Route imports
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./src/config/swagger");
const authRoutes = require("./src/routes/auth.routes");
const configRoutes = require("./src/routes/config.routes");
const spamRoutes = require("./src/routes/spam.routes");
const interestRoutes = require("./src/routes/interest.routes");
const analyticsRoutes = require("./src/routes/analytics.routes");
const broadcastRoutes = require("./src/routes/broadcast.routes");
const groupRoutes = require("./src/routes/group.routes");
const userRoutes = require("./src/routes/user.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.CORS_ORIGIN,
        "http://localhost:5000",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:64587",
      ].filter(Boolean);

      // Allow requests with no origin (e.g., mobile apps, Postman in dev)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed.`));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false }));

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ─── API Documentation (Vercel Serverless Fix) ────────────────────────────────
const CSS_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui.css";
const JS_URLS = [
  "https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui-bundle.js",
  "https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"
];

app.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .scheme-container { background: #0f172a !important }
      .swagger-ui { background: #0f172a !important; color: #f8fafc !important }
    `,
    customCssUrl: CSS_URL,
    customJs: JS_URLS,
    customSiteTitle: "COME Admin API Docs",
  }),
);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/config", configRoutes);
app.use("/api/spam", spamRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/broadcast", broadcastRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/users", userRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
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
