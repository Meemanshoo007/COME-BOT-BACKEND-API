const {
    getAllInterests,
    addInterest,
    updateInterestStatus,
    bulkUpdateInterestStatus,
} = require('../services/interest.service');
const { interestAddSchema } = require('../validators/schemas');
const { recordLog } = require('../services/audit_log.service');

const listInterests = async (req, res) => {
    try {
        const interests = await getAllInterests(true); // Always admin view
        return res.status(200).json({ success: true, data: interests });
    } catch (err) {
        console.error('[Interest] List error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch interests.' });
    }
};

const createInterest = async (req, res) => {
    const { error, value } = interestAddSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    try {
        const createdBy = req.admin.id;
        
        const result = await addInterest(value.name, createdBy);
        if (!result) {
            await recordLog({
                req,
                action: 'ADD_INTEREST',
                module: 'INTERESTS',
                description: `Failed to add interest "${value.name}": already exists`,
                details: { name: value.name },
                status: 'FAILED',
                errorMessage: 'Interest already exists.',
            });
            return res.status(409).json({ success: false, message: 'Interest already exists.' });
        }

        await recordLog({
            req,
            action: 'ADD_INTEREST',
            module: 'INTERESTS',
            description: `Added interest "${value.name}"`,
            details: { id: result.id, name: value.name },
            status: 'SUCCESS',
        });

        return res.status(201).json({ success: true, data: result });
    } catch (err) {
        console.error('[Interest] Create error:', err.message);
        await recordLog({
            req,
            action: 'ADD_INTEREST',
            module: 'INTERESTS',
            description: `Failed to add interest "${value?.name}"`,
            details: value,
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to add interest.' });
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
        const updated = await updateInterestStatus(id, status, updatedBy);
        if (!updated) {
            await recordLog({
                req,
                action: 'TOGGLE_INTEREST',
                module: 'INTERESTS',
                description: `Failed to update interest #${id}: not found`,
                details: { id, status },
                status: 'FAILED',
                errorMessage: 'Interest not found.',
            });
            return res.status(404).json({ success: false, message: 'Interest not found.' });
        }

        await recordLog({
            req,
            action: 'TOGGLE_INTEREST',
            module: 'INTERESTS',
            description: `${status ? 'Activated' : 'Deactivated'} interest #${id}`,
            details: { id, status, name: updated.name },
            status: 'SUCCESS',
        });

        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('[Interest] Toggle status error:', err.message);
        await recordLog({
            req,
            action: 'TOGGLE_INTEREST',
            module: 'INTERESTS',
            description: `Failed to toggle status for interest #${id}`,
            details: { id, status },
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to update interest status.' });
    }
};

const bulkToggleStatus = async (req, res) => {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || typeof status !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid IDs or status.' });
    }

    try {
        const updatedBy = req.admin.id;
        const updated = await bulkUpdateInterestStatus(ids, status, updatedBy);

        await recordLog({
            req,
            action: 'BULK_TOGGLE_INTEREST',
            module: 'INTERESTS',
            description: `Bulk updated ${ids.length} interests to ${status ? 'active' : 'inactive'}`,
            details: { count: ids.length, ids, status },
            status: 'SUCCESS',
        });

        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('[Interest] Bulk toggle status error:', err.message);
        await recordLog({
            req,
            action: 'BULK_TOGGLE_INTEREST',
            module: 'INTERESTS',
            description: `Failed bulk update for interests`,
            details: { ids, status },
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to update interests status.' });
    }
};

module.exports = { listInterests, createInterest, toggleStatus, bulkToggleStatus };
