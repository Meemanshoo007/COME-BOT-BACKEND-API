const express = require('express');
const {
    listAdmins,
    createAdmin,
    updateAdmin,
    toggleStatus,
    changePassword,
    deleteAdmin,
} = require('../controllers/admin_user.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All admin management routes require an active admin JWT
router.use(authMiddleware);

router.get('/', listAdmins);
router.post('/', createAdmin);
router.patch('/:id', updateAdmin);
router.patch('/:id/status', toggleStatus);
router.patch('/:id/password', changePassword);
router.delete('/:id', deleteAdmin);

module.exports = router;
