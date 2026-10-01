const express = require('express');
const {
  listRoles,
  getRole,
  createRole,
  updateRole,
  toggleRoleStatus,
  deleteRole,
} = require('../controllers/role.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All role routes require authenticated admin
router.use(authMiddleware);

router.get('/', listRoles);
router.get('/:id', getRole);
router.post('/', createRole);
router.patch('/:id', updateRole);
router.patch('/:id/status', toggleRoleStatus);
router.delete('/:id', deleteRole);

module.exports = router;
