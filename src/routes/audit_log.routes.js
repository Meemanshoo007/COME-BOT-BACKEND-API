const express = require('express');
const { listAuditLogs, getLatestAuditLogs, streamAuditLogs } = require('../controllers/audit_log.controller');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Require active admin JWT token
router.use(authMiddleware);

// Requires 'logs.view' permission (Super Admin wildcard '*' always passes)
router.get('/', requirePermission('logs.view'), listAuditLogs);
router.get('/latest', requirePermission('logs.view'), getLatestAuditLogs);
router.get('/stream', requirePermission('logs.view'), streamAuditLogs);

module.exports = router;
