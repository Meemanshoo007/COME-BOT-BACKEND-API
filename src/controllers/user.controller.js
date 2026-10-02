const { getAllUsers, addXP } = require('../services/user.service');
const { recordLog } = require('../services/audit_log.service');

const listUsers = async (req, res) => {
    try {
        const { search = '', interestIds = '', page = 1, limit = 200 } = req.query;
        // interestIds comes as comma-separated: "1,3,5"
        const parsedInterestIds = interestIds
            ? interestIds.split(',').map(Number).filter(Boolean)
            : [];
        const data = await getAllUsers({
            search,
            interestIds: parsedInterestIds,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
        });
        return res.status(200).json({ success: true, ...data });
    } catch (err) {
        console.error('[User] List error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
    }
};

const updateXP = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined || isNaN(amount)) {
        return res.status(400).json({ success: false, message: 'Invalid amount.' });
    }

    try {
        const updatedBy = req.admin.id;
        const user = await addXP(id, parseInt(amount, 10), updatedBy);
        if (!user) {
            await recordLog({
                req,
                action: 'UPDATE_XP',
                module: 'USERS',
                description: `Failed to add ${amount} XP to user #${id}: user not found`,
                details: { user_id: id, amount },
                status: 'FAILED',
                errorMessage: 'User not found.',
            });
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await recordLog({
            req,
            action: 'UPDATE_XP',
            module: 'USERS',
            description: `Added ${amount} XP to user #${id}`,
            details: { user_id: id, amount, new_xp: user.xp },
            status: 'SUCCESS',
        });

        return res.status(200).json({ success: true, data: user });
    } catch (err) {
        console.error('[User] Update XP error:', err.message);
        await recordLog({
            req,
            action: 'UPDATE_XP',
            module: 'USERS',
            description: `Failed to add ${amount} XP to user #${id}`,
            details: { user_id: id, amount },
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to update XP.' });
    }
};

module.exports = { listUsers, updateXP };
