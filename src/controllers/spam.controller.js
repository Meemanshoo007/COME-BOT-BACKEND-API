const { getAllSpam, addSpamKeyword, updateSpamStatus, bulkUpdateSpamStatus } = require('../services/spam.service');
const { spamAddSchema } = require('../validators/schemas');
const { recordLog } = require('../services/audit_log.service');

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
        const createdBy = req.admin.id;
        const result = await addSpamKeyword(value.keyword, createdBy);
        if (!result) {
            await recordLog({
                req,
                action: 'ADD_KEYWORD',
                module: 'SPAM',
                description: `Failed to add spam keyword "${value.keyword}": already exists`,
                details: { keyword: value.keyword },
                status: 'FAILED',
                errorMessage: 'Keyword already exists.',
            });
            return res.status(409).json({ success: false, message: 'Keyword already exists.' });
        }

        await recordLog({
            req,
            action: 'ADD_KEYWORD',
            module: 'SPAM',
            description: `Added spam keyword "${value.keyword}"`,
            details: { keyword: value.keyword, id: result.id },
            status: 'SUCCESS',
        });

        return res.status(201).json({ success: true, data: result });
    } catch (err) {
        console.error('[Spam] Create error:', err.message);
        await recordLog({
            req,
            action: 'ADD_KEYWORD',
            module: 'SPAM',
            description: `Failed to add spam keyword "${value?.keyword}"`,
            details: value,
            status: 'FAILED',
            errorMessage: err.message,
        });
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
        const updatedBy = req.admin.id;
        const updated = await updateSpamStatus(id, status, updatedBy);
        if (!updated) {
            await recordLog({
                req,
                action: 'TOGGLE_KEYWORD',
                module: 'SPAM',
                description: `Failed to update spam keyword #${id}: not found`,
                details: { id, status },
                status: 'FAILED',
                errorMessage: 'Keyword not found.',
            });
            return res.status(404).json({ success: false, message: 'Keyword not found.' });
        }

        await recordLog({
            req,
            action: 'TOGGLE_KEYWORD',
            module: 'SPAM',
            description: `${status ? 'Activated' : 'Deactivated'} spam keyword #${id}`,
            details: { id, status, keyword: updated.keyword },
            status: 'SUCCESS',
        });

        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('[Spam] Toggle status error:', err.message);
        await recordLog({
            req,
            action: 'TOGGLE_KEYWORD',
            module: 'SPAM',
            description: `Failed to toggle status for spam keyword #${id}`,
            details: { id, status },
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to update keyword status.' });
    }
};

const bulkToggleStatus = async (req, res) => {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || typeof status !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid IDs or status.' });
    }

    try {
        const updatedBy = req.admin.id;
        const updated = await bulkUpdateSpamStatus(ids, status, updatedBy);

        await recordLog({
            req,
            action: 'BULK_TOGGLE_KEYWORD',
            module: 'SPAM',
            description: `Bulk updated ${ids.length} spam keywords to ${status ? 'active' : 'inactive'}`,
            details: { count: ids.length, ids, status },
            status: 'SUCCESS',
        });

        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('[Spam] Bulk toggle status error:', err.message);
        await recordLog({
            req,
            action: 'BULK_TOGGLE_KEYWORD',
            module: 'SPAM',
            description: `Failed bulk update for spam keywords`,
            details: { ids, status },
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to update keywords status.' });
    }
};

module.exports = { listSpam, createSpam, toggleStatus, bulkToggleStatus };
