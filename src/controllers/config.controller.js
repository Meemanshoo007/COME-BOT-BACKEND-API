const { getBotConfig, updateBotConfig } = require('../services/config.service');
const { configUpdateSchema } = require('../validators/schemas');
const { recordLog } = require('../services/audit_log.service');

const getConfig = async (req, res) => {
    try {
        const config = await getBotConfig();
        return res.status(200).json({ success: true, data: config });
    } catch (err) {
        console.error('[Config] Get error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch config.' });
    }
};

const patchConfig = async (req, res) => {
    const { error, value } = configUpdateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    try {
        const updated = await updateBotConfig({
            spamLimit: value.spam_limit,
            muteDurationMinutes: value.mute_duration_minutes,
            maintenanceMode: value.maintenance_mode,
            maintenanceMessage: value.maintenance_message,
            isKilled: value.is_killed,
        });

        await recordLog({
            req,
            action: 'UPDATE_SETTINGS',
            module: 'CONFIG',
            description: 'Updated bot configuration settings',
            details: value,
            status: 'SUCCESS',
        });

        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('[Config] Update error:', err.message);
        await recordLog({
            req,
            action: 'UPDATE_SETTINGS',
            module: 'CONFIG',
            description: 'Failed to update bot configuration settings',
            details: value,
            status: 'FAILED',
            errorMessage: err.message,
        });
        return res.status(500).json({ success: false, message: 'Failed to update config.' });
    }
};

module.exports = { getConfig, patchConfig };
