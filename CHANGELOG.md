# COME Backend — Changelog

---

## [v1.1.0] — 2026-03-01
### Added
- **Poll Management API**:
  - `GET /api/polls`: List all created polls with their options.
  - `POST /api/polls`: Schedule a new poll globally or by interest. Now returns the full poll object.
  - `GET /api/polls/:id/analytics`: Retrieve vote counts and **voter name lists** (for non-anonymous polls).
  - `DELETE /api/polls/:id`: Cancel scheduled polls.
  - Validation: Updated `pollCreateSchema` to make `interest_ids` and `correct_option_index` optional/nullable, fixing "must be a number" errors when not in Quiz Mode.
- Routes: Mounted `/api/polls` in `index.js`.
- Services: Created `poll.service.js` to handle complex multi-table inserts (poll + options) within database transactions.

---

## [v1.0.1] — 2026-02-28
### Changed
- Git: Updated `.gitignore` with comprehensive patterns for logs, environment files, build artifacts, and IDE configs to prepare for production deployment.
- Vercel: Added `vercel.json` for proper routing.
- Vercel: Updated `index.js` to export the `app` for serverless function compatibility.
- Database: Added support for `DATABASE_URL` environment variables to allow seamless connection to cloud databases like **Neon**.
- Debug: Added a **Public Test Endpoint** at `/api/test-db` to verify database connectivity and read/write permissions (no authentication required for testing).
- Documentation: Removed Swagger UI and related documentation routes to keep the production build lightweight.
- Vercel: Added `app.set("trust proxy", 1)` to fix rate-limiting issues behind Vercel's proxy.

---

## [v1.0.0] — 2026-02-26
### Added
- Initial project setup for Admin REST API.
- PostgreSQL connection pool using node-postgres.
- JWT-based authentication system for admin sessions.
- Security middleware: Helmet, CORS, and Express-Rate-Limit.
- Request validation using Joi schemas.
- API Endpoints:
    - `POST /api/auth/login`: Admin authentication.
    - `GET/PATCH /api/config`: Bot settings management.
    - `GET/POST/DELETE /api/spam`: Spam keyword management.
    - `GET/POST/PATCH/DELETE /api/interests`: Community interests management.
    - `GET /api/analytics`: Overview and interest statistics.
    - `GET/POST/DELETE /api/broadcast`: Push message scheduling and history.
- Health check endpoint `/health`.
