const { getOverviewStats, getUserJoinStats } = require('../services/analytics.service');

const overviewStats = async (req, res) => {
    try {
        const data = await getOverviewStats();
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Analytics] Overview stats error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch overview stats.' });
    }
};

const userJoinStats = async (req, res) => {
    try {
        const { interval = 'weekly' } = req.query;
        if (!['daily', 'weekly', 'monthly', 'yearly'].includes(interval)) {
            return res.status(400).json({ success: false, message: 'Invalid interval. Must be daily, weekly, monthly, or yearly.' });
        }
        const data = await getUserJoinStats({ interval });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Analytics] User join stats error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch user join stats.' });
    }
};

module.exports = { overviewStats, userJoinStats };
