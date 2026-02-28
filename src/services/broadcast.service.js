const pool = require("../config/db");

/** Get all broadcasts (not cancelled), newest first */
const getAllBroadcasts = async () => {
    const result = await pool.query(`
        SELECT
            sm.id,
            sm.message_text,
            sm.interest_ids,
            sm.scheduled_time,
            sm.status,
            sm.is_cancelled,
            sm.created_by,
            sm.created_at,
            sm.updated_at,
            (
                SELECT COUNT(DISTINCT ui.telegram_id)
                FROM user_interests ui
                WHERE ui.interest_id = ANY(
                    SELECT jsonb_array_elements_text(sm.interest_ids)::int
                ) AND ui.status = TRUE
            ) as target_count
        FROM scheduled_messages sm
        WHERE sm.is_cancelled = FALSE
        ORDER BY sm.scheduled_time DESC
    `);
    return result.rows;
};

/** Create a new scheduled message */
const createBroadcast = async (
    messageText,
    interestIds,
    scheduledTime,
    createdBy,
) => {
    const result = await pool.query(
        `INSERT INTO scheduled_messages
       (message_text, interest_ids, scheduled_time, status, created_by, is_cancelled)
     VALUES ($1, $2, $3, 'pending', $4, FALSE)
     RETURNING *`,
        [messageText, JSON.stringify(interestIds), scheduledTime, createdBy],
    );
    return result.rows[0];
};

/** Soft-delete: mark as cancelled (only works while still pending) */
const cancelBroadcast = async (id) => {
    const result = await pool.query(
        `UPDATE scheduled_messages 
         SET is_cancelled = TRUE 
         WHERE id = $1 AND status = 'pending' AND is_cancelled = FALSE`,
        [id],
    );
    return result.rowCount > 0;
};

/** Get broadcast logs with per-user status */
const getBroadcastLogs = async (messageId) => {
    const result = await pool.query(
        `WITH targets AS (
        SELECT DISTINCT
            tp.telegram_id,
            tp.name as user_name
        FROM telegram_profile tp
        JOIN user_interests ui ON ui.telegram_id = tp.telegram_id
        WHERE ui.interest_id = ANY(
           SELECT jsonb_array_elements_text(interest_ids)::int 
           FROM scheduled_messages 
           WHERE id = $1
        ) AND ui.status = TRUE
    ),
    logs AS (
        SELECT 
            bl.id,
            bl.user_id,
            bl.status,
            bl.error_msg,
            bl.created_at,
            tp.name AS user_name
        FROM broadcast_logs bl
        LEFT JOIN telegram_profile tp ON tp.telegram_id = bl.user_id
        WHERE bl.scheduled_message_id = $1
    )
    SELECT 
        COALESCE(l.id, -1) as id,
        COALESCE(l.user_id, t.telegram_id) as user_id,
        COALESCE(l.status, 'not_sent') as status,
        l.error_msg,
        l.created_at,
        COALESCE(l.user_name, t.user_name) as user_name
    FROM targets t
    LEFT JOIN logs l ON t.telegram_id = l.user_id
    UNION
    SELECT 
        id, user_id, status, error_msg, created_at, user_name
    FROM logs
    WHERE user_id NOT IN (SELECT telegram_id FROM targets)
    ORDER BY status ASC, created_at DESC`,
        [messageId],
    );
    return result.rows;
};

/** Retry sending to a specific failed/not_sent user for a broadcast — IMMEDIATELY */
const retryBroadcastForUser = async (broadcastId, userId) => {
    // 1. Get message text
    const msgRes = await pool.query(
        "SELECT message_text FROM scheduled_messages WHERE id = $1",
        [broadcastId],
    );
    if (msgRes.rowCount === 0) throw new Error("Broadcast message not found");
    const text = msgRes.rows[0].message_text;

    // 2. Send via Telegram API
    const botToken = process.env.BOT_TOKEN;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    let status = "failed";
    let errorMsg = null;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: userId,
                text: text,
                parse_mode: "HTML",
            }),
        });
        const data = await response.json();
        if (data.ok) {
            status = "success";
        } else {
            errorMsg = data.description || "Unknown Telegram error";
        }
    } catch (err) {
        errorMsg = err.message;
    }

    // 3. Update logs — clear any old log first
    await pool.query(
        "DELETE FROM broadcast_logs WHERE scheduled_message_id = $1 AND user_id = $2",
        [broadcastId, userId],
    );
    await pool.query(
        "INSERT INTO broadcast_logs (scheduled_message_id, user_id, status, error_msg, created_at) VALUES ($1, $2, $3, $4, NOW())",
        [broadcastId, userId, status, errorMsg],
    );

    return { success: status === "success", status, error: errorMsg };
};

/** Get the list of users who are the target for this broadcast (by interest) */
const getBroadcastTargetUsers = async (messageId) => {
    const result = await pool.query(
        `SELECT DISTINCT
            tp.telegram_id,
            tp.name,
            tp.name
         FROM telegram_profile tp
         JOIN user_interests ui ON ui.telegram_id = tp.telegram_id
         WHERE ui.interest_id = ANY(
            SELECT jsonb_array_elements_text(interest_ids)::int 
            FROM scheduled_messages 
            WHERE id = $1
         ) AND ui.status = TRUE
         ORDER BY tp.name ASC`,
        [messageId],
    );
    return result.rows;
};

module.exports = {
    getAllBroadcasts,
    createBroadcast,
    cancelBroadcast,
    getBroadcastLogs,
    retryBroadcastForUser,
    getBroadcastTargetUsers,
};
