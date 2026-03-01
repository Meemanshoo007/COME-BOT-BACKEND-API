const {
    listAllPolls,
    createPollRecord,
    getPollAnalytics,
    deletePollRecord
} = require('../services/poll.service');
const { pollCreateSchema } = require('../validators/schemas');

const listPolls = async (req, res) => {
    try {
        const data = await listAllPolls();
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Poll] List error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch polls.' });
    }
};

const createPoll = async (req, res) => {
    const { error, value } = pollCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }
    try {
        const result = await createPollRecord(value);
        return res.status(201).json({ success: true, message: 'Poll scheduled successfully.', data: result });
    } catch (err) {
        console.error('[Poll] Create error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to schedule poll.' });
    }
};

const analytics = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    try {
        const data = await getPollAnalytics(id);
        if (!data) return res.status(404).json({ success: false, message: 'Poll not found.' });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Poll] Analytics error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch poll analytics.' });
    }
};

const cancelPoll = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    try {
        const deleted = await deletePollRecord(id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Poll not found.' });
        return res.status(200).json({ success: true, message: 'Poll cancelled/deleted.' });
    } catch (err) {
        console.error('[Poll] Cancel error:', err.message);
        return res.status(500).json({ success: false, message: err.message || 'Failed to cancel poll.' });
    }
};

module.exports = {
    listPolls,
    createPoll,
    analytics,
    cancelPoll
};
