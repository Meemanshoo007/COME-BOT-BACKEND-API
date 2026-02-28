const express = require("express");
const pool = require("../config/db");

const router = express.Router();

/**
 * @swagger
 * /test-db:
 *   get:
 *     summary: Initialize Database Schema
 *     description: Creates all required tables for the project if they do not exist.
 *     tags: [Setup]
 *     responses:
 *       200:
 *         description: Database setup successful
 */
router.get("/", async (req, res) => {
    try {
        console.log("[Setup] Initializing Database Schema...");

        // Create all project tables
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
        id BIGINT PRIMARY KEY, -- telegram_id
        status BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        created_by BIGINT,
        updated_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Spam Keywords
      CREATE TABLE IF NOT EXISTS spam (
        id SERIAL PRIMARY KEY,
        keyword TEXT UNIQUE NOT NULL,
        status BOOLEAN DEFAULT TRUE,
        created_by BIGINT,
        updated_by BIGINT,
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
        updated_by BIGINT,
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
        created_by BIGINT,
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

        // Seed Default Config
        await pool.query(`
      INSERT INTO config (id, spam_limit, mute_duration_minutes, maintenance_mode, maintenance_message)
      VALUES (1, 3, 1, false, '🚧 The bot is currently under maintenance. Please try again later. 🚧')
      ON CONFLICT (id) DO NOTHING
    `);

        res.json({
            success: true,
            message: "🚀 Database schema initialized successfully!",
            tables_verified: [
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
        console.error("[Setup Error]", err.message);
        res.status(500).json({
            success: false,
            message: "❌ Database initialization failed.",
            error: err.message,
        });
    }
});

module.exports = router;
