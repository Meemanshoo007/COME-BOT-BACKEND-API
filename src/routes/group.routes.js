const express = require('express');
const {
    listGroups,
    createGroup,
    toggleStatus,
    bulkToggleStatus,
} = require('../controllers/group.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listGroups);
router.post('/', createGroup);
router.patch('/:id/status', toggleStatus);
router.post('/bulk-status', bulkToggleStatus);

module.exports = router;
