const express = require('express');
const { listSpam, createSpam, toggleStatus, bulkToggleStatus } = require('../controllers/spam.controller');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', requirePermission('spam.view'), listSpam);
router.post('/', requirePermission('spam.manage'), createSpam);
router.patch('/:id/status', requirePermission('spam.manage'), toggleStatus);
router.post('/bulk-status', requirePermission('spam.manage'), bulkToggleStatus);

module.exports = router;
