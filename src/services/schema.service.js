const pool = require('../config/db');

let schemaMigrated = false;

const ensureSchemaColumns = async () => {
    if (schemaMigrated) return;
    try {
        await pool.query(`
            DO $$
            BEGIN
                -- spam table
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'spam' AND column_name = 'created_by' AND data_type != 'character varying'
                ) THEN
                    ALTER TABLE spam ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::VARCHAR(255);
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'spam' AND column_name = 'updated_by' AND data_type != 'character varying'
                ) THEN
                    ALTER TABLE spam ALTER COLUMN updated_by TYPE VARCHAR(255) USING updated_by::VARCHAR(255);
                END IF;

                -- interests table
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'interests' AND column_name = 'created_by' AND data_type != 'character varying'
                ) THEN
                    ALTER TABLE interests ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::VARCHAR(255);
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'interests' AND column_name = 'updated_by' AND data_type != 'character varying'
                ) THEN
                    ALTER TABLE interests ALTER COLUMN updated_by TYPE VARCHAR(255) USING updated_by::VARCHAR(255);
                END IF;

                -- allowed_groups table
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'allowed_groups' AND column_name = 'updated_by' AND data_type != 'character varying'
                ) THEN
                    ALTER TABLE allowed_groups ALTER COLUMN updated_by TYPE VARCHAR(255) USING updated_by::VARCHAR(255);
                END IF;

                -- scheduled_messages table
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'scheduled_messages' AND column_name = 'created_by' AND data_type != 'character varying'
                ) THEN
                    ALTER TABLE scheduled_messages ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::VARCHAR(255);
                END IF;

                -- telegram_profile table
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'telegram_profile' AND column_name = 'updated_by' AND data_type != 'character varying'
                ) THEN
                    ALTER TABLE telegram_profile ALTER COLUMN updated_by TYPE VARCHAR(255) USING updated_by::VARCHAR(255);
                END IF;

                -- poll table
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'poll' AND column_name = 'created_by' AND data_type != 'character varying'
                ) THEN
                    ALTER TABLE poll ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::VARCHAR(255);
                END IF;
            END $$;
        `);
        schemaMigrated = true;
        console.log('[DB Schema] Verified VARCHAR(255) for created_by and updated_by columns.');
    } catch (err) {
        console.warn('[DB Schema] Schema migration check warning:', err.message);
    }
};

ensureSchemaColumns();

module.exports = { ensureSchemaColumns };
