const { getAllSpam, addSpamKeyword, updateSpamStatus, bulkUpdateSpamStatus } = require('../services/spam.service');
const { spamAddSchema } = require('../validators/schemas');

const listSpam = async (req, res) => {
    try {
        const spam = await getAllSpam();
        return res.status(200).json({ success: true, data: spam });
    } catch (err) {
        console.error('[Spam] List error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch spam keywords.' });
    }
};

const createSpam = async (req, res) => {
    const { error, value } = spamAddSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    try {
        const createdBy = req.admin.telegram_id;
        const result = await addSpamKeyword(value.keyword, createdBy);
        if (!result) {
            return res.status(409).json({ success: false, message: 'Keyword already exists.' });
        }
        return res.status(201).json({ success: true, data: result });
    } catch (err) {
        console.error('[Spam] Create error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to add spam keyword.' });
    }
};

const toggleStatus = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isNaN(id) || typeof status !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid ID or status.' });
    }

    try {
        const updatedBy = req.admin.telegram_id;
        const updated = await updateSpamStatus(id, status, updatedBy);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Keyword not found.' });
        }
        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('[Spam] Toggle status error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update keyword status.' });
    }
};

const bulkToggleStatus = async (req, res) => {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || typeof status !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid IDs or status.' });
    }

    try {
        const updatedBy = req.admin.telegram_id;
        const updated = await bulkUpdateSpamStatus(ids, status, updatedBy);
        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('[Spam] Bulk toggle status error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update keywords status.' });
    }
};

module.exports = { listSpam, createSpam, toggleStatus, bulkToggleStatus };
