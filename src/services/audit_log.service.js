const pool = require('../config/db');

let schemaMigrated = false;

/**
 * Ensure the audit_logs table and performance indexes exist.
 */
const ensureSchema = async () => {
    if (schemaMigrated) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                admin_id VARCHAR(255),
                admin_name VARCHAR(255),
                action VARCHAR(100) NOT NULL,
                module VARCHAR(100) NOT NULL,
                description TEXT,
                details JSONB DEFAULT '{}'::jsonb,
                status VARCHAR(50) DEFAULT 'SUCCESS',
                error_message TEXT,
                ip_address VARCHAR(100),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs (admin_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs (module);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs (status);
        `);
        schemaMigrated = true;
        console.log('[Audit Log Service] audit_logs table and indexes verified.');
    } catch (e) {
        console.warn('[Audit Log Service] Schema migration error:', e.message);
    }
};

// Initial verification on startup
ensureSchema();

/**
 * Record an audit log entry safely.
 * Strips sensitive fields (passwords, secrets) from the details payload.
 */
const recordLog = async ({
    req,
    adminId,
    adminName,
    action,
    module: targetModule,
    description,
    details = {},
    status = 'SUCCESS',
    errorMessage = null,
}) => {
    try {
        await ensureSchema();

        const callerId = String(adminId || req?.admin?.id || 'SYSTEM').trim();
        let callerName = adminName || req?.admin?.name || null;

        // Try to fetch caller display name if not yet known
        if (!callerName && callerId && callerId !== 'SYSTEM') {
            try {
                const profile = await pool.query(`
                    SELECT name FROM telegram_profile WHERE user_id::TEXT = $1 LIMIT 1
                `, [callerId]);
                if (profile.rows.length > 0 && profile.rows[0].name) {
                    callerName = profile.rows[0].name;
                }
            } catch (_) {}
        }

        // Sanitize details: never persist passwords, tokens, or raw secrets
        let sanitizedDetails = {};
        if (details && typeof details === 'object') {
            sanitizedDetails = Array.isArray(details) ? [...details] : { ...details };
            const redactKeys = [
                'password',
                'confirmPassword',
                'confirm_password',
                'newPassword',
                'new_password',
                'token',
                'jwt',
                'secret',
                'authorization',
            ];
            for (const key of redactKeys) {
                if (sanitizedDetails[key] !== undefined) {
                    sanitizedDetails[key] = '***';
                }
            }
        }

        const ip = req
            ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || null)
            : null;
        const userAgent = req?.headers ? (req.headers['user-agent'] || null) : null;

        await pool.query(`
            INSERT INTO audit_logs (
                admin_id, admin_name, action, module, description, details, status, error_message, ip_address, user_agent, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, NOW())
        `, [
            callerId,
            callerName,
            action,
            targetModule,
            description,
            JSON.stringify(sanitizedDetails),
            status.toUpperCase(),
            errorMessage,
            ip,
            userAgent,
        ]);
    } catch (e) {
        console.error('[Audit Log] Failed to record log entry:', e.message);
    }
};

/**
 * Fetch paginated audit logs with optional filtering.
 */
const getAuditLogs = async ({
    search = '',
    admin_id,
    module: filterModule,
    status,
    start_date,
    end_date,
    page = 1,
    limit = 20,
} = {}) => {
    await ensureSchema();

    const cleanPage = Math.max(1, parseInt(page, 10) || 1);
    const cleanLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (cleanPage - 1) * cleanLimit;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search && search.trim() !== '') {
        const s = `%${search.trim()}%`;
        params.push(s);
        conditions.push(`(
            l.admin_id ILIKE $${paramIndex} OR 
            COALESCE(l.admin_name, '') ILIKE $${paramIndex} OR 
            l.action ILIKE $${paramIndex} OR 
            l.module ILIKE $${paramIndex} OR 
            l.description ILIKE $${paramIndex} OR
            COALESCE(l.error_message, '') ILIKE $${paramIndex}
        )`);
        paramIndex++;
    }

    if (admin_id && admin_id.trim() !== '' && admin_id !== 'all') {
        params.push(admin_id.trim());
        conditions.push(`l.admin_id = $${paramIndex}`);
        paramIndex++;
    }

    if (filterModule && filterModule.trim() !== '' && filterModule !== 'all') {
        params.push(filterModule.trim().toUpperCase());
        conditions.push(`UPPER(l.module) = $${paramIndex}`);
        paramIndex++;
    }

    if (status && status.trim() !== '' && status !== 'all') {
        params.push(status.trim().toUpperCase());
        conditions.push(`UPPER(l.status) = $${paramIndex}`);
        paramIndex++;
    }

    if (start_date) {
        params.push(start_date);
        conditions.push(`l.created_at >= $${paramIndex}`);
        paramIndex++;
    }

    if (end_date) {
        params.push(end_date);
        conditions.push(`l.created_at <= $${paramIndex}`);
        paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::INT AS total FROM audit_logs l ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    const dataQuery = `
        SELECT 
            l.id,
            l.admin_id,
            l.admin_name,
            l.action,
            l.module,
            l.description,
            l.details,
            l.status,
            l.error_message,
            l.ip_address,
            l.user_agent,
            l.created_at
        FROM audit_logs l
        ${whereClause}
        ORDER BY l.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await pool.query(dataQuery, [...params, cleanLimit, offset]);

    // Distinct modules and admins for filter UI options
    const modulesRes = await pool.query(`SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL ORDER BY module ASC`);
    const distinctModules = modulesRes.rows.map(r => r.module).filter(Boolean);

    const adminsRes = await pool.query(`
        SELECT DISTINCT admin_id, admin_name 
        FROM audit_logs 
        WHERE admin_id IS NOT NULL AND admin_id != '' 
        ORDER BY admin_id ASC
    `);

    return {
        logs: dataResult.rows,
        total,
        page: cleanPage,
        limit: cleanLimit,
        totalPages: Math.ceil(total / cleanLimit) || 1,
        modules: distinctModules,
        admins: adminsRes.rows,
    };
};

module.exports = {
    recordLog,
    getAuditLogs,
    ensureSchema,
};
