const { getAllUsers, addXP } = require('../services/user.service');

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
    try {
        const { id } = req.params;
        const { amount } = req.body;

        if (amount === undefined || isNaN(amount)) {
            return res.status(400).json({ success: false, message: 'Invalid amount.' });
        }

        const user = await addXP(id, parseInt(amount, 10));
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.status(200).json({ success: true, data: user });
    } catch (err) {
        console.error('[User] Update XP error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to update XP.' });
    }
};

module.exports = { listUsers, updateXP };
