const auditLogService = require('../services/audit_log.service');

const listAuditLogs = async (req, res) => {
    try {
        const {
            search = '',
            admin_id,
            module: filterModule,
            status,
            start_date,
            end_date,
            page = 1,
            limit = 20,
        } = req.query;

        const data = await auditLogService.getAuditLogs({
            search,
            admin_id,
            module: filterModule,
            status,
            start_date,
            end_date,
            page,
            limit,
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (err) {
        console.error('[Audit Log] listAuditLogs error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve audit logs.',
        });
    }
};

module.exports = {
    listAuditLogs,
};
