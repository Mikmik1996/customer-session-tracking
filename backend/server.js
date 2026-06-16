const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Serve all frontend static files automatically
app.use(express.static(path.join(__dirname, "../frontend")));

/* ==========================================
    🎯 FIXED DATABASE CONFIGURATION PARSER
========================================== */
const getDatabaseConfig = () => {
  // 1. Try to read from any variations of unified connection URLs
  const unifiedUrl = process.env.MYSQL_URL || process.env.MYSQLURL || process.env.DATABASE_URL;
  if (unifiedUrl) {
    console.log("🔌 Database configured via unified connection URL string.");
    return { uri: unifiedUrl };
  }

  // 2. Fallback to extracting explicit connection environment variables (supporting both layout styles)
  const host = process.env.MYSQLHOST || process.env.MYSQL_HOST || "127.0.0.1";
  const user = process.env.MYSQLUSER || process.env.MYSQL_USER || "root";
  const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.MYSQL_DB || "railway";
  const port = parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || "3306", 10);

  console.log(`🔌 Database properties resolved -> Host: ${host}, Port: ${port}, User: ${user}, DB: ${database}`);

  return { host, user, password, database, port };
};

// Establish configuration parameters
const baseConfig = getDatabaseConfig();

// Create primary application query connection pool instance based on resolved configurations
const pool = baseConfig.uri 
  ? mysql.createPool(baseConfig.uri)
  : mysql.createPool({
      host: baseConfig.host,
      user: baseConfig.user,
      password: baseConfig.password,
      database: baseConfig.database,
      port: baseConfig.port,
      waitForConnections: true,
      connectionLimit: 5,         // Lowered to prevent connection exhaustion in production
      queueLimit: 0,
      connectTimeout: 20000       // Extended to 20s to allow slower internal container meshes to initialize safely
    });

// Track layout schema deployment readiness state globally
let tablesReady = false;

// 🛠️ Dynamic Database Table Migrator
async function ensureTablesExist() {
  if (tablesReady) return true;
  
  let connection;
  try {
    // Grab an authenticated client directly out of our pre-configured Railway pool
    connection = await pool.getConnection();

    // 1. Build the active tracking sessions table structure if missing
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customer_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_contact VARCHAR(255) NULL,
        package_id INT NOT NULL,
        staff_id INT DEFAULT 1,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Build the staff login credential verification table structure if missing
    await connection.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log("🚀 DATABASE INITIALIZATION COMPLETE: All tracking tables verified successfully!");
    tablesReady = true;
    return true;
  } catch (err) {
    console.error("⚠️ Database pool connection pending. Retrying... Reason:", err.message);
    return false;
  } finally {
    if (connection) connection.release(); // Securely return client connection back to the main pool
  }
}

// Trigger initial bootstrapping loop pass immediately on container environment wake up
ensureTablesExist();

/* ==========================================
    🔑 USER ACCESS & FAILSAFE AUTHENTICATION
========================================== */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`🔑 Login validation checkpoint for: ${username}`);

  if (username === "admin" && password === "jump123") {
    console.log("🎯 Access granted via hardcoded administrator bypass.");
    return res.json({ success: true });
  }

  try {
    await ensureTablesExist();
    const [rows] = await pool.query(
      "SELECT * FROM staff WHERE username = ? AND password = ?", 
      [username, password]
    );

    if (rows.length > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error("⚠️ Fallback validation active. Rejecting query request.");
    res.json({ success: false });
  }
});

/* ==========================================
    📊 ACTIVE REAL-TIME DASHBOARD SESSIONS
========================================== */
app.get("/api/sessions/active", async (req, res) => {
  try {
    const isReady = await ensureTablesExist();
    if (!isReady) {
      return res.json([]); 
    }

    const [rows] = await pool.query(
      "SELECT * FROM customer_sessions WHERE end_time IS NULL ORDER BY start_time DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching active panel layout row items:", err.message);
    res.status(500).json([]);
  }
});

/* ==========================================
    ➕ CREATE NEW SESSIONS
========================================== */
app.post("/api/sessions", async (req, res) => {
  const { client_name, client_contact, package_id, staff_id } = req.body;
  try {
    await ensureTablesExist();
    await pool.query(
      "INSERT INTO customer_sessions (client_name, client_contact, package_id, staff_id, start_time) VALUES (?, ?, ?, ?, NOW())",
      [client_name, client_contact, package_id, staff_id || 1]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving transaction:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ==========================================
    🛑 TERMINATE / REMOVE TRACKING SESSIONS
========================================== */
app.post("/api/sessions/:id/end", async (req, res) => {
  const { id } = req.params;
  try {
    await ensureTablesExist();
    await pool.query(
      "UPDATE customer_sessions SET end_time = NOW() WHERE id = ?",
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error concluding customer timeline context:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ==========================================
    📈 ANALYTICS CHART METRICS
========================================== */
app.get("/api/chart-data", async (req, res) => {
  const { start, end } = req.query;
  
  let sql = `
    SELECT 
      CASE 
        WHEN package_id = 1 THEN '30 mins'
        WHEN package_id = 2 THEN '1 hour'
        WHEN package_id = 3 THEN '1.5 hours'
        WHEN package_id = 4 THEN '2 hours'
        WHEN package_id = 5 THEN 'Unlimited'
        ELSE 'Unknown'
      END AS package_name,
      COUNT(*) AS count 
    FROM customer_sessions
  `;
  
  const params = [];
  if (start && end) {
    sql += " WHERE DATE(CONVERT_TZ(start_time, '+00:00', '+08:00')) BETWEEN ? AND ? ";
    params.push(start, end);
  }
  
  sql += " GROUP BY package_id ORDER BY package_id ASC";

  try {
    await ensureTablesExist();
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Analytics aggregator compilation failed:", err.message);
    res.status(500).json([]);
  }
});

/* ==========================================
    📥 EXPORT LOGS ROUTE
========================================== */
app.get("/api/export", async (req, res) => {
  const { start, end } = req.query;

  let sql = `
    SELECT 
      client_name, 
      client_contact,
      CASE 
        WHEN package_id = 1 THEN '30 mins'
        WHEN package_id = 2 THEN '1 hour'
        WHEN package_id = 3 THEN '1.5 hours'
        WHEN package_id = 4 THEN '2 hours'
        WHEN package_id = 5 THEN 'Unlimited'
        ELSE 'Other'
      END AS package_name,
      CONVERT_TZ(start_time, '+00:00', '+08:00') AS local_start,
      CONVERT_TZ(end_time, '+00:00', '+08:00') AS local_end
    FROM customer_sessions
  `;

  const params = [];
  if (start && end) {
    sql += " WHERE DATE(CONVERT_TZ(start_time, '+00:00', '+08:00')) BETWEEN ? AND ? ";
    params.push(start, end);
  }

  sql += " ORDER BY start_time DESC";

  try {
    await ensureTablesExist();
    const [rows] = await pool.query(sql, params);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=Wiijum_Report_${start || "All"}_to_${end || "All"}.csv`);

    let csvContent = "Date,Customer Name,Contact Number,Package,Start Time,End Time\n";

    rows.forEach(row => {
      const startDateObj = new Date(row.local_start);
      const dateString = !isNaN(startDateObj) ? startDateObj.toLocaleDateString("en-PH") : "-";
      const startTimeString = !isNaN(startDateObj) ? startDateObj.toLocaleTimeString("en-PH", { hour: '2-digit', minute: '2-digit' }) : "-";
      
      let endTimeString = "-";
      if (row.local_end) {
        const endDateObj = new Date(row.local_end);
        if (!isNaN(endDateObj)) {
          endTimeString = endDateObj.toLocaleTimeString("en-PH", { hour: '2-digit', minute: '2-digit' });
        }
      }

      csvContent += `"${dateString}","${row.client_name}","${row.client_contact}","${row.package_name}","${startTimeString}","${endTimeString}"\n`;
    });

    res.send(csvContent);
  } catch (err) {
    console.error("❌ CSV engine compiler error:", err.message);
    res.status(500).send("Error exporting business metric reports csv");
  }
});

// Fallback Wildcard route for UI asset redirection mapping
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server fully operational and running live on port ${PORT}`);
});