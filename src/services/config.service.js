const pool = require('../config/db');

/**
 * Fetches the bot configuration row (always id=1).
 * Creates a default row if not present.
 */
const getBotConfig = async () => {
    // Auto-migration: Ensure is_killed column exists
    try {
        await pool.query(`
            ALTER TABLE config 
            ADD COLUMN IF NOT EXISTS is_killed BOOLEAN DEFAULT false
        `);
    } catch (err) {
        console.warn('[Config Service] Column "is_killed" check/add failed (may already exist):', err.message);
    }

    // Ensure default row exists
    await pool.query(`
    INSERT INTO config (id, spam_limit, mute_duration_minutes, maintenance_mode, maintenance_message, is_killed)
    VALUES (1, 3, 1, false, '🚧 The bot is currently under maintenance. Please try again later. 🚧', false)
    ON CONFLICT (id) DO NOTHING
  `);

    const result = await pool.query('SELECT * FROM config WHERE id = 1');
    return result.rows[0];
};

/**
 * Updates one or more config fields.
 * Only updates fields that are passed (non-undefined).
 */
const updateBotConfig = async (fields) => {
    const { spamLimit, muteDurationMinutes, maintenanceMode, maintenanceMessage, isKilled } = fields;

    const updates = [];
    const values = [];
    let idx = 1;

    if (spamLimit !== undefined) {
        updates.push(`spam_limit = $${idx++}`);
        values.push(spamLimit);
    }
    if (muteDurationMinutes !== undefined) {
        updates.push(`mute_duration_minutes = $${idx++}`);
        values.push(muteDurationMinutes);
    }
    if (maintenanceMode !== undefined) {
        updates.push(`maintenance_mode = $${idx++}`);
        values.push(maintenanceMode);
    }
    if (maintenanceMessage !== undefined) {
        updates.push(`maintenance_message = $${idx++}`);
        values.push(maintenanceMessage);
    }
    if (isKilled !== undefined) {
        updates.push(`is_killed = $${idx++}`);
        values.push(isKilled);
    }

    if (updates.length === 0) return await getBotConfig();

    values.push(1); // WHERE id = 1
    const result = await pool.query(
        `UPDATE config SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
    );
    return result.rows[0];
};

module.exports = { getBotConfig, updateBotConfig };
