require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function testQuery() {
    try {
        console.log("🔍 Testing connection to Neon...");
        const timeRes = await pool.query("SELECT NOW()");
        console.log("✅ Connection Successful! Server time:", timeRes.rows[0].now);

        console.log("\n🔍 Checking if 'admin' table exists and querying...");
        try {
            // We'll use a dummy ID just to see if the table exists and the query runs
            const adminRes = await pool.query(
                "SELECT id, status FROM admin WHERE id = $1",
                [8314288270],
            );
            console.log("✅ Query successful! Rows found:", adminRes.rows.length);
            if (adminRes.rows.length === 0) {
                console.log(
                    "ℹ️ Table exists, but no admin found with ID 8314288270. This is expected if you haven't added yourself yet.",
                );
            }
        } catch (err) {
            if (err.code === "42P01") {
                console.error(
                    "❌ 'admin' table does NOT exist yet. Please run /api/setup-db first.",
                );
            } else {
                console.error("❌ Query error:", err.message);
            }
        }
    } catch (err) {
        console.error("❌ Connection failed:", err.message);
    } finally {
        await pool.end();
    }
}

testQuery();
