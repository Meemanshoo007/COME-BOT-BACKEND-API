const express = require('express');
const {
    listPolls,
    createPoll,
    analytics,
    cancelPoll,
    saveWinners
} = require('../controllers/poll.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', listPolls);
router.post('/', createPoll);
router.get('/:id/analytics', analytics);
router.delete('/:id', cancelPoll);
router.post('/:id/winners', saveWinners);

module.exports = router;
