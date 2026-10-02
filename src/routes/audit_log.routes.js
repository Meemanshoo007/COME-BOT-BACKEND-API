const express = require('express');
const { listAuditLogs } = require('../controllers/audit_log.controller');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Require active admin JWT token
router.use(authMiddleware);

// Requires 'logs.view' permission (Super Admin wildcard '*' always passes)
router.get('/', requirePermission('logs.view'), listAuditLogs);

module.exports = router;
