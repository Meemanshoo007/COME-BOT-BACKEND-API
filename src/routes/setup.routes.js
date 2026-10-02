const express = require("express");
const pool = require("../config/db");

const router = express.Router();

/**
 * Public Endpoint to initialize the database schema.
 * Creates all 9 project tables and seeds the default config.
 */
router.get("/", async (req, res) => {
    try {
        console.log("[DB Setup] Starting database initialization...");

        await pool.query(`
      -- 1. Profiles
      CREATE TABLE IF NOT EXISTS telegram_profile (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        telegram_id BIGINT UNIQUE NOT NULL,
        come_uid BIGINT UNIQUE,
        discord_id TEXT,
        xp INT DEFAULT 0,
        level INT DEFAULT 1,
        spam_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Admin access
      CREATE TABLE IF NOT EXISTS admin (
        id VARCHAR(255) PRIMARY KEY,
        status BOOLEAN DEFAULT TRUE,
        password VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. Bot Config
      CREATE TABLE IF NOT EXISTS config (
        id INT PRIMARY KEY,
        spam_limit INT DEFAULT 3,
        mute_duration_minutes INT DEFAULT 1,
        maintenance_mode BOOLEAN DEFAULT FALSE,
        maintenance_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. Interests
      CREATE TABLE IF NOT EXISTS interests (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        status BOOLEAN DEFAULT TRUE,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Spam Keywords
      CREATE TABLE IF NOT EXISTS spam (
        id SERIAL PRIMARY KEY,
        keyword TEXT UNIQUE NOT NULL,
        status BOOLEAN DEFAULT TRUE,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. User Interests Join
      CREATE TABLE IF NOT EXISTS user_interests (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        interest_id INT NOT NULL,
        status BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(telegram_id, interest_id)
      );

      -- 7. Allowed Groups
      CREATE TABLE IF NOT EXISTS allowed_groups (
        id SERIAL PRIMARY KEY,
        group_id BIGINT UNIQUE NOT NULL,
        group_name TEXT,
        status BOOLEAN DEFAULT TRUE,
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Broadcast System
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id SERIAL PRIMARY KEY,
        message_text TEXT NOT NULL,
        interest_ids JSONB DEFAULT '[]',
        scheduled_time TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'pending',
        is_cancelled BOOLEAN DEFAULT FALSE,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS broadcast_logs (
        id SERIAL PRIMARY KEY,
        scheduled_message_id INT REFERENCES scheduled_messages(id),
        user_id BIGINT,
        status TEXT,
        error_msg TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Seed default bot configuration
        await pool.query(`
      INSERT INTO config (id, spam_limit, mute_duration_minutes, maintenance_mode, maintenance_message)
      VALUES (1, 3, 1, false, '🚧 The bot is currently under maintenance. Please try again later. 🚧')
      ON CONFLICT (id) DO NOTHING
    `);

        // Alter poll table to add new columns if they do not exist
        await pool.query(`
          ALTER TABLE poll ADD COLUMN IF NOT EXISTS description TEXT;
          ALTER TABLE poll ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT TRUE;
          ALTER TABLE poll ADD COLUMN IF NOT EXISTS close_date TIMESTAMPTZ;
          ALTER TABLE poll ADD COLUMN IF NOT EXISTS hide_result BOOLEAN DEFAULT FALSE;
        `);

        // Alter admin table to allow string IDs and support password & updated_at
        await pool.query(`
          ALTER TABLE admin ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
          ALTER TABLE admin ADD COLUMN IF NOT EXISTS password VARCHAR(255);
          ALTER TABLE admin ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

          -- Migrate creator and updater columns to VARCHAR(255)
          ALTER TABLE spam ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::VARCHAR(255);
          ALTER TABLE spam ALTER COLUMN updated_by TYPE VARCHAR(255) USING updated_by::VARCHAR(255);
          ALTER TABLE interests ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::VARCHAR(255);
          ALTER TABLE interests ALTER COLUMN updated_by TYPE VARCHAR(255) USING updated_by::VARCHAR(255);
          ALTER TABLE allowed_groups ALTER COLUMN updated_by TYPE VARCHAR(255) USING updated_by::VARCHAR(255);
          ALTER TABLE scheduled_messages ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::VARCHAR(255);
          ALTER TABLE telegram_profile ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
          ALTER TABLE telegram_profile ALTER COLUMN updated_by TYPE VARCHAR(255) USING updated_by::VARCHAR(255);
        `);

        // Roles table & foreign key on admin
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

          ALTER TABLE admin ADD COLUMN IF NOT EXISTS role_id INT;
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_admin_role') THEN
              ALTER TABLE admin ADD CONSTRAINT fk_admin_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;
            END IF;
          END $$;

          INSERT INTO roles (name, description, permissions, is_system, status)
          VALUES 
            ('Super Admin', 'Unrestricted full access across all capabilities, data, and settings.', '["*"]'::jsonb, true, true),
            ('Community Moderator', 'Moderates user accounts, inspects spam activity, and manages spam rate limits.', '["dashboard.view", "polls.view", "polls.create", "users.view", "users.manage_xp", "spam.view", "spam.manage", "groups.view", "config.view", "config.spam_limit", "config.mute_duration", "config.maintenance_mode"]'::jsonb, false, true),
            ('Content & Broadcast Lead', 'Creates announcements, promotional broadcasts, and manages maintenance messages.', '["dashboard.view", "broadcasts.view", "broadcasts.create", "broadcasts.cancel", "polls.view", "polls.create", "interests.view", "config.view", "config.maintenance_message"]'::jsonb, false, true),
            ('Customer Support Specialist', 'Assists end-users, monitors user inquiries, and views bot settings.', '["dashboard.view", "users.view", "users.export", "interests.view", "interests.manage", "config.view"]'::jsonb, false, true),
            ('Security Auditor', 'Audit logs, review admin access, inspect bot behavior and analytics without modification rights.', '["dashboard.view", "broadcasts.view", "polls.view", "users.view", "spam.view", "interests.view", "groups.view", "admins.view", "roles.view", "config.view"]'::jsonb, false, true)
          ON CONFLICT (name) DO NOTHING;

          UPDATE admin 
          SET role_id = (SELECT id FROM roles WHERE is_system = true OR name = 'Super Admin' LIMIT 1)
          WHERE role_id IS NULL;
        `);

        console.log("✅ [DB Setup] Database schema initialized successfully!");

        res.json({
            success: true,
            message: "🚀 Neon Database INITIALIZED! All tables created/verified.",
            tables: [
                "telegram_profile",
                "admin",
                "config",
                "interests",
                "spam",
                "user_interests",
                "allowed_groups",
                "scheduled_messages",
                "broadcast_logs",
            ],
        });
    } catch (err) {
        console.error("❌ [DB Setup Error]", err.message);
        res.status(500).json({
            success: false,
            message: "❌ Database initialization failed.",
            error: err.message,
        });
    }
});

module.exports = router;
