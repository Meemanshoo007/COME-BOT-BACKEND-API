const {
    getAllGroups,
    addAllowedGroup,
    updateGroupStatus,
    bulkUpdateGroupStatus,
} = require('../services/group.service');
const { recordLog } = require('../services/audit_log.service');

const listGroups = async (req, res) => {
    try {
        const groups = await getAllGroups();
        return res.status(200).json({ success: true, data: groups });
    } catch (err) {
        console.error('[Group] List error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch groups.' });
    }
};

const createGroup = async (req, res) => {
    const { groupId, groupName } = req.body;
    if (!groupId) {
        return res.status(400).json({ success: false, message: 'Group ID is required.' });
    }

    try {
        const result = await addAllowedGroup(groupId, groupName || 'Unnamed Group');
        if (!result) {
            await recordLog({
                req,
                action: 'ADD_GROUP',
                module: 'GROUPS',
                description: `Failed to add group "${groupName || groupId}": already allowed`,
                details: { groupId, groupName },
                status: 'FAILED',
                errorMessage: 'Group already allowed.',
            });
            return res.status(409).json({ success: false, message: 'Group already allowed.' });
        }

        await recordLog({
            req,
            action: 'ADD_GROUP',
            module: 'GROUPS',
            description: `Added allowed group "${groupName || groupId}" (${groupId})`,
            details: { id: result.id, groupId, groupName },
            status: 'SUCCESS',
        });

        return res.status(201).json({ success: true, data: result });
    } catch (err) {
        console.error('[Group] Create error:', err.message);
        await recordLog({
            req,
            action: 'ADD_GROUP',
            module: 'GROUPS',
            description: `Failed to add group "${groupName || groupId}"`,
            details: { groupId, groupName },
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to add group.' });
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
        const updated = await updateGroupStatus(id, status, updatedBy);
        if (!updated) {
            await recordLog({
                req,
                action: 'TOGGLE_GROUP',
                module: 'GROUPS',
                description: `Failed to update group #${id}: not found`,
                details: { id, status },
                status: 'FAILED',
                errorMessage: 'Group not found.',
            });
            return res.status(404).json({ success: false, message: 'Group not found.' });
        }

        await recordLog({
            req,
            action: 'TOGGLE_GROUP',
            module: 'GROUPS',
            description: `${status ? 'Activated' : 'Deactivated'} group "${updated.group_name}" (${updated.group_id})`,
            details: { id, status, group_name: updated.group_name, group_id: updated.group_id },
            status: 'SUCCESS',
        });

        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('[Group] Toggle status error:', err.message);
        await recordLog({
            req,
            action: 'TOGGLE_GROUP',
            module: 'GROUPS',
            description: `Failed to toggle status for group #${id}`,
            details: { id, status },
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to update group status.' });
    }
};

const bulkToggleStatus = async (req, res) => {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || typeof status !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid IDs or status.' });
    }

    try {
        const updatedBy = req.admin.id;
        const updated = await bulkUpdateGroupStatus(ids, status, updatedBy);

        await recordLog({
            req,
            action: 'BULK_TOGGLE_GROUP',
            module: 'GROUPS',
            description: `Bulk updated ${ids.length} groups to ${status ? 'active' : 'inactive'}`,
            details: { count: ids.length, ids, status },
            status: 'SUCCESS',
        });

        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('[Group] Bulk toggle status error:', err.message);
        await recordLog({
            req,
            action: 'BULK_TOGGLE_GROUP',
            module: 'GROUPS',
            description: `Failed bulk update for groups`,
            details: { ids, status },
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to update groups status.' });
    }
};

module.exports = { listGroups, createGroup, toggleStatus, bulkToggleStatus };
