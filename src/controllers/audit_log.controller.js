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

const getLatestAuditLogs = async (req, res) => {
    try {
        const {
            after_id,
            admin_id,
            module: filterModule,
            status,
            search = '',
        } = req.query;

        const data = await auditLogService.getLatestLogs({
            after_id,
            admin_id,
            module: filterModule,
            status,
            search,
        });

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (err) {
        console.error('[Audit Log] getLatestAuditLogs error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch latest audit logs.',
        });
    }
};

const streamAuditLogs = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) res.flushHeaders();

    // Send initial connected ping
    res.write('event: connected\ndata: {"status":"connected"}\n\n');

    const onNewLog = (log) => {
        try {
            res.write(`data: ${JSON.stringify(log)}\n\n`);
        } catch (_) {}
    };

    auditLogService.auditEmitter.on('new_log', onNewLog);

    const pingInterval = setInterval(() => {
        try {
            res.write('event: ping\ndata: {}\n\n');
        } catch (_) {}
    }, 25000);

    req.on('close', () => {
        clearInterval(pingInterval);
        auditLogService.auditEmitter.off('new_log', onNewLog);
    });
};

module.exports = {
    listAuditLogs,
    getLatestAuditLogs,
    streamAuditLogs,
};

