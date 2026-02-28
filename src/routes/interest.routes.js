const express = require('express');
const {
    listInterests,
    createInterest,
    toggleStatus,
    bulkToggleStatus,
} = require('../controllers/interest.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listInterests);
router.post('/', createInterest);
router.patch('/:id/status', toggleStatus);
router.post('/bulk-status', bulkToggleStatus);

module.exports = router;
