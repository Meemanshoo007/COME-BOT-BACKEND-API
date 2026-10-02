const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Middleware: Verifies the JWT Bearer token on every protected route.
 * Verifies that the admin account is active and that their assigned role is active.
 * Attaches `req.admin` = { id } on success.
 */
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authorization token missing.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;

        const adminId = String(decoded.id).trim();
        const check = await pool.query(`
            SELECT 
                a.status AS admin_status, 
                a.role_id,
                r.id AS joined_role_id,
                r.status AS role_status, 
                r.name AS role_name,
                COALESCE(r.permissions, '["*"]'::jsonb) AS permissions
            FROM admin a
            LEFT JOIN roles r ON r.id = a.role_id
            WHERE a.id::TEXT = $1
        `, [adminId]);

        if (check.rows.length === 0 || check.rows[0].admin_status === false) {
            return res.status(403).json({
                success: false,
                message: 'Admin account not found or deactivated.'
            });
        }

        const adminData = check.rows[0];
        if (adminData.role_id) {
            if (!adminData.joined_role_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Your assigned role no longer exists. Please contact a Super Admin.'
                });
            }
            if (adminData.role_status === false) {
                return res.status(403).json({
                    success: false,
                    message: `Your assigned role ("${adminData.role_name || 'Assigned Role'}") is inactive.`
                });
            }
        }

        let permissions = ['*'];
        if (adminData.permissions) {
            if (Array.isArray(adminData.permissions)) {
                permissions = adminData.permissions;
            } else if (typeof adminData.permissions === 'string') {
                try {
                    permissions = JSON.parse(adminData.permissions);
                } catch (_) {
                    permissions = ['*'];
                }
            }
        }

        req.admin = {
            ...decoded,
            id: adminId,
            role_id: adminData.role_id,
            role_name: adminData.role_name,
            permissions,
        };

        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ success: false, message: 'Authorization token missing.' });
        }
        const perms = req.admin.permissions || ['*'];
        if (perms.includes('*') || perms.includes(permission)) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: `Access denied. Requires '${permission}' permission.`,
        });
    };
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requirePermission = requirePermission;
