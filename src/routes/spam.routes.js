const express = require('express');
const { listSpam, createSpam, toggleStatus, bulkToggleStatus } = require('../controllers/spam.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listSpam);
router.post('/', createSpam);
router.patch('/:id/status', toggleStatus);
router.post('/bulk-status', bulkToggleStatus);

module.exports = router;
