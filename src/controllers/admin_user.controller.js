const adminUserService = require('../services/admin_user.service');
const {
    adminCreateSchema,
    adminUpdateSchema,
    adminChangePasswordSchema,
} = require('../validators/schemas');

const listAdmins = async (req, res) => {
    try {
        const { search = '', status = 'all', page = 1, limit = 20 } = req.query;
        const validStatuses = ['all', 'active', 'inactive'];
        const cleanStatus = validStatuses.includes(status) ? status : 'all';

        const data = await adminUserService.listAdmins({
            search,
            status: cleanStatus,
            page: Math.max(1, parseInt(page, 10) || 1),
            limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
        });

        return res.status(200).json({ success: true, ...data });
    } catch (err) {
        console.error('[Admin] List error:', err.message);
        return res.status(500).json({ success: false, message: err.message || 'Failed to fetch admins.' });
    }
};

const createAdmin = async (req, res) => {
    const { error, value } = adminCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    try {
        value.id = String(value.id).trim();
        const data = await adminUserService.createAdmin(value);
        return res.status(201).json({
            success: true,
            data,
            message: 'Admin created successfully.',
        });
    } catch (err) {
        console.error('[Admin] Create error:', err.message);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || 'Failed to create admin.',
        });
    }
};

const updateAdmin = async (req, res) => {
    const id = req.params.id ? String(req.params.id).trim() : '';
    if (!id) {
        return res.status(400).json({ success: false, message: 'Invalid admin ID.' });
    }

    const { error, value } = adminUpdateSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    if (value.newId !== undefined) {
        value.newId = String(value.newId).trim();
    }

    // Safeguard: cannot deactivate self
    if (String(req.admin?.id) === String(id) && value.status === false) {
        return res.status(400).json({
            success: false,
            message: 'You cannot deactivate your own admin account.',
        });
    }

    try {
        const data = await adminUserService.updateAdmin(id, value);
        return res.status(200).json({
            success: true,
            data,
            message: 'Admin updated successfully.',
        });
    } catch (err) {
        console.error('[Admin] Update error:', err.message);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || 'Failed to update admin.',
        });
    }
};

const toggleStatus = async (req, res) => {
    const id = req.params.id ? String(req.params.id).trim() : '';
    if (!id) {
        return res.status(400).json({ success: false, message: 'Invalid admin ID.' });
    }

    const { status } = req.body;
    if (typeof status !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Status must be a boolean.' });
    }

    // Safeguard: cannot deactivate self
    if (String(req.admin?.id) === String(id) && status === false) {
        return res.status(400).json({
            success: false,
            message: 'You cannot deactivate your own admin account.',
        });
    }

    try {
        const data = await adminUserService.toggleAdminStatus(id, status);
        return res.status(200).json({
            success: true,
            data,
            message: `Admin ${status ? 'activated' : 'deactivated'} successfully.`,
        });
    } catch (err) {
        console.error('[Admin] Toggle status error:', err.message);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || 'Failed to toggle admin status.',
        });
    }
};

const changePassword = async (req, res) => {
    const id = req.params.id ? String(req.params.id).trim() : '';
    if (!id) {
        return res.status(400).json({ success: false, message: 'Invalid admin ID.' });
    }

    const { error, value } = adminChangePasswordSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    try {
        const data = await adminUserService.changeAdminPassword(id, value.password);
        return res.status(200).json({
            success: true,
            data,
            message: 'Password changed successfully.',
        });
    } catch (err) {
        console.error('[Admin] Change password error:', err.message);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || 'Failed to change admin password.',
        });
    }
};

const deleteAdmin = async (req, res) => {
    const id = req.params.id ? String(req.params.id).trim() : '';
    if (!id) {
        return res.status(400).json({ success: false, message: 'Invalid admin ID.' });
    }

    // Safeguard: cannot delete self
    if (String(req.admin?.id) === String(id)) {
        return res.status(400).json({
            success: false,
            message: 'You cannot delete your own admin account.',
        });
    }

    try {
        await adminUserService.deleteAdmin(id);
        return res.status(200).json({
            success: true,
            message: 'Admin deleted successfully.',
        });
    } catch (err) {
        console.error('[Admin] Delete error:', err.message);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: err.message || 'Failed to delete admin.',
        });
    }
};

module.exports = {
    listAdmins,
    createAdmin,
    updateAdmin,
    toggleStatus,
    changePassword,
    deleteAdmin,
};
