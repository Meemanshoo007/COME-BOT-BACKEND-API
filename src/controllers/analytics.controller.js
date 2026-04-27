const { getOverviewStats } = require('../services/analytics.service');

const overviewStats = async (req, res) => {
    try {
        const data = await getOverviewStats();
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('[Analytics] Overview stats error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch overview stats.' });
    }
};

module.exports = { overviewStats };
