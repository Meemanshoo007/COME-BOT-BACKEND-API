const express = require('express');
const {
    listInterests,
    createInterest,
    toggleStatus,
    bulkToggleStatus,
} = require('../controllers/interest.controller');
const { authMiddleware, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', requirePermission('interests.view'), listInterests);
router.post('/', requirePermission('interests.manage'), createInterest);
router.patch('/:id/status', requirePermission('interests.manage'), toggleStatus);
router.post('/bulk-status', requirePermission('interests.manage'), bulkToggleStatus);

module.exports = router;
