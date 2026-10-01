const roleService = require('../services/role.service');
const { roleCreateSchema, roleUpdateSchema } = require('../validators/schemas');
const Joi = require('joi');

const listRoles = async (req, res) => {
  try {
    const { search, status } = req.query;
    const roles = await roleService.listRoles({ search, status });
    return res.status(200).json({
      success: true,
      roles,
      total: roles.length,
    });
  } catch (err) {
    console.error('[Role Controller] listRoles error:', err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error.',
    });
  }
};

const getRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid role ID.' });
    }
    const role = await roleService.getRoleById(id);
    return res.status(200).json({ success: true, data: role });
  } catch (err) {
    console.error('[Role Controller] getRole error:', err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error.',
    });
  }
};

const createRole = async (req, res) => {
  const { error, value } = roleCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  try {
    const role = await roleService.createRole(value);
    return res.status(201).json({
      success: true,
      message: 'Role created successfully.',
      data: role,
    });
  } catch (err) {
    console.error('[Role Controller] createRole error:', err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error.',
    });
  }
};

const updateRole = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid role ID.' });
  }

  const { error, value } = roleUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  try {
    const updated = await roleService.updateRole(id, value);
    return res.status(200).json({
      success: true,
      message: 'Role updated successfully.',
      data: updated,
    });
  } catch (err) {
    console.error('[Role Controller] updateRole error:', err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error.',
    });
  }
};

const toggleRoleStatus = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid role ID.' });
  }

  const schema = Joi.object({
    status: Joi.boolean().required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }

  try {
    const updated = await roleService.toggleRoleStatus(id, value.status);
    return res.status(200).json({
      success: true,
      message: `Role status updated to ${value.status ? 'active' : 'inactive'}.`,
      data: updated,
    });
  } catch (err) {
    console.error('[Role Controller] toggleRoleStatus error:', err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error.',
    });
  }
};

const deleteRole = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid role ID.' });
  }

  try {
    const deleted = await roleService.deleteRole(id);
    return res.status(200).json({
      success: true,
      message: `Role "${deleted.name}" deleted successfully.`,
      data: deleted,
    });
  } catch (err) {
    console.error('[Role Controller] deleteRole error:', err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error.',
    });
  }
};

module.exports = {
  listRoles,
  getRole,
  createRole,
  updateRole,
  toggleRoleStatus,
  deleteRole,
};
