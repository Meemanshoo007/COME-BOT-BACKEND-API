const pool = require('../config/db');

const listAllPolls = async () => {
    const result = await pool.query(`
        SELECT p.*, 
        (SELECT json_agg(o.*) FROM poll_option o WHERE o.poll_id = p.id) as options
        FROM poll p
        ORDER BY p.scheduled_at DESC
    `);
    return result.rows;
};

const createPollRecord = async (pollData) => {
    const {
        question,
        options,
        is_anonymous,
        allows_multiple_answers,
        is_quiz,
        correct_option_index,
        explanation,
        interest_ids,
        scheduled_at
    } = pollData;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const pollResult = await client.query(
            `INSERT INTO poll (
                question, 
                is_anonymous, 
                allows_multiple_answers, 
                is_quiz, 
                correct_option_index, 
                explanation, 
                interest_ids, 
                scheduled_at,
                is_sent,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW(), NOW()) RETURNING id`,
            [
                question,
                is_anonymous,
                allows_multiple_answers,
                is_quiz,
                correct_option_index,
                explanation,
                JSON.stringify(interest_ids),
                scheduled_at
            ]
        );

        const pollId = pollResult.rows[0].id;

        for (const optionText of options) {
            await client.query(
                `INSERT INTO poll_option (poll_id, text, votes) VALUES ($1, $2, 0)`,
                [pollId, optionText]
            );
        }

        await client.query('COMMIT');

        // Return full poll with options
        const result = await client.query(`
            SELECT p.*, 
            (SELECT json_agg(o.*) FROM poll_option o WHERE o.poll_id = p.id) as options
            FROM poll p WHERE p.id = $1
        `, [pollId]);

        return result.rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

const getPollAnalytics = async (pollId) => {
    const pollResult = await pool.query('SELECT * FROM poll WHERE id = $1', [pollId]);
    if (pollResult.rows.length === 0) return null;

    const optionsResult = await pool.query('SELECT * FROM poll_option WHERE poll_id = $1 ORDER BY id ASC', [pollId]);
    const votersResult = await pool.query('SELECT * FROM poll_vote WHERE poll_id = $1 ORDER BY created_at DESC', [pollId]);

    return {
        ...pollResult.rows[0],
        options: optionsResult.rows,
        voters: votersResult.rows
    };
};

const deletePollRecord = async (pollId) => {
    const pollResult = await pool.query('SELECT * FROM poll WHERE id = $1', [pollId]);
    if (pollResult.rows.length === 0) return false;

    if (pollResult.rows[0].is_sent) {
        throw new Error('Cannot delete a poll that has already been sent.');
    }

    await pool.query('DELETE FROM poll_option WHERE poll_id = $1', [pollId]);
    await pool.query('DELETE FROM poll WHERE id = $1', [pollId]);
    return true;
};

module.exports = {
    listAllPolls,
    createPollRecord,
    getPollAnalytics,
    deletePollRecord
};
