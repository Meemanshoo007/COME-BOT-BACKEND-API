const express = require('express');
const {
    listBroadcasts,
    scheduleBroadcast,
    softCancelBroadcast,
    broadcastLogs,
    retryUser,
    retryAllFailed,
    getBroadcastTargets,
} = require('../controllers/broadcast.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', listBroadcasts);
router.post('/', scheduleBroadcast);
router.get('/:id/logs', broadcastLogs);
router.patch('/:id/cancel', softCancelBroadcast);        // soft cancel
router.get('/:id/target-users', getBroadcastTargets);
router.post('/:id/retry-all', retryAllFailed);           // retry all failed
router.post('/:id/retry/:userId', retryUser);            // retry one user

module.exports = router;
