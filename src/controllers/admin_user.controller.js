const adminUserService = require('../services/admin_user.service');
const {
    adminCreateSchema,
    adminUpdateSchema,
    adminChangePasswordSchema,
} = require('../validators/schemas');

const listAdmins = async (req, res) => {
    try {
        const { search = '', status = 'all', role_id, page = 1, limit = 20 } = req.query;
        const validStatuses = ['all', 'active', 'inactive'];
        const cleanStatus = validStatuses.includes(status) ? status : 'all';

        const data = await adminUserService.listAdmins({
            search,
            status: cleanStatus,
            role_id,
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

        // Privilege check: only Super Admins can create admins with the Super Admin role
        if (value.role_id !== undefined && value.role_id !== null) {
            const roleIsSuper = await adminUserService.isSuperAdminRole(value.role_id);
            if (roleIsSuper) {
                const callerIsSuper = await adminUserService.isSuperAdminAccount(req.admin?.id);
                if (!callerIsSuper) {
                    return res.status(403).json({
                        success: false,
                        message: 'Only Super Admins can create an admin with the Super Admin role.',
                    });
                }
            }
        }

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

    const callerId = String(req.admin?.id || '').trim();
    const isSelf = callerId === id;

    // Safeguard: cannot deactivate self
    if (isSelf && value.status === false) {
        return res.status(400).json({
            success: false,
            message: 'You cannot deactivate your own admin account.',
        });
    }

    try {
        // Safeguard: Super Admin accounts cannot be modified by another admin
        const targetIsSuper = await adminUserService.isSuperAdminAccount(id);
        if (targetIsSuper && !isSelf) {
            return res.status(403).json({
                success: false,
                message: 'Super Admin accounts cannot be modified by another admin.',
            });
        }

        // If target is Super Admin and isSelf: cannot demote own account from Super Admin
        if (targetIsSuper && isSelf && value.role_id !== undefined && value.role_id !== null) {
            const newRoleIsSuper = await adminUserService.isSuperAdminRole(value.role_id);
            if (!newRoleIsSuper) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot remove or demote the Super Admin role from your own account.',
                });
            }
        }

        // If assigning a Super Admin role to someone, caller must be a Super Admin
        if (value.role_id !== undefined && value.role_id !== null) {
            const newRoleIsSuper = await adminUserService.isSuperAdminRole(value.role_id);
            if (newRoleIsSuper) {
                const callerIsSuper = await adminUserService.isSuperAdminAccount(callerId);
                if (!callerIsSuper) {
                    return res.status(403).json({
                        success: false,
                        message: 'Only Super Admins can assign the Super Admin role.',
                    });
                }
            }
        }

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

    const callerId = String(req.admin?.id || '').trim();
    const isSelf = callerId === id;

    // Safeguard: cannot deactivate self
    if (isSelf && status === false) {
        return res.status(400).json({
            success: false,
            message: 'You cannot deactivate your own admin account.',
        });
    }

    try {
        // Safeguard: Super Admin accounts cannot be deactivated
        const targetIsSuper = await adminUserService.isSuperAdminAccount(id);
        if (targetIsSuper) {
            return res.status(403).json({
                success: false,
                message: 'Super Admin accounts cannot be deactivated.',
            });
        }

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

    const callerId = String(req.admin?.id || '').trim();
    const isSelf = callerId === id;

    try {
        // Safeguard: Cannot change password of another Super Admin account
        const targetIsSuper = await adminUserService.isSuperAdminAccount(id);
        if (targetIsSuper && !isSelf) {
            return res.status(403).json({
                success: false,
                message: 'You cannot change the password of another Super Admin account.',
            });
        }

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

    const callerId = String(req.admin?.id || '').trim();
    // Safeguard: cannot delete self
    if (callerId === id) {
        return res.status(400).json({
            success: false,
            message: 'You cannot delete your own admin account.',
        });
    }

    try {
        // Safeguard: Super Admin accounts cannot be deleted
        const targetIsSuper = await adminUserService.isSuperAdminAccount(id);
        if (targetIsSuper) {
            return res.status(403).json({
                success: false,
                message: 'Super Admin accounts cannot be deleted.',
            });
        }

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
