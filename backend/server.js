const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '../frontend')));

/* ==========================================
    🎯 DATABASE CONFIGURATION (RAILWAY POOL)
========================================== */
const getDatabaseConfig = () => {
  if (process.env.MYSQL_URL) return { uri: process.env.MYSQL_URL };
  if (process.env.DATABASE_URL) return { uri: process.env.DATABASE_URL };

  return {
    host: process.env.MYSQLHOST || "localhost",
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "",
    database: process.env.MYSQLDATABASE || "wiijum_db",
    port: parseInt(process.env.MYSQLPORT || "3306", 10)
  };
};

const pool = mysql.createPool({
  ...getDatabaseConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* ==========================================
    🛠️ AUTO-INITIALIZE TABLES (BLOCKING BOOT)
========================================== */
async function initializeDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("🚀 DATABASE CONNECTED SUCCESSFULLY TO RAILWAY MYSQL POOL!");

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
    console.log("📦 System Schema: customer_sessions table verified.");

    // 2. Build the staff login credential verification table structure if missing
    await connection.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("📦 System Schema: staff authentication table verified.");

    return true;
  } catch (err) {
    console.error("⚠️ Critical database structure setup failure:", err.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

/* ==========================================
    🌐 API ENDPOINTS / ROUTING
========================================== */

// Authenticators
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`🔑 Login validation checkpoint for: ${username}`);
  
  if (username === 'admin' && password === 'jump123') {
    console.log("🎯 Access granted via hardcoded administrator bypass.");
    return res.json({ success: true, token: "mock-jwt-token" });
  }
  res.status(401).json({ success: false, error: "Invalid credentials" });
});

// Fetch Active Tracking Sessions
app.get('/api/sessions/active', async (req, res) => {
  try {
    // This query will now never run until the table structure is guaranteed to exist
    const [rows] = await pool.query(
      `SELECT * FROM customer_sessions WHERE end_time IS NULL ORDER BY start_time DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching active panel layout row items:", err.message);
    res.status(500).json({ error: "Database query execution failure" });
  }
});

// Add New Session Transaction
app.post('/api/sessions', async (req, res) => {
  const { client_name, client_contact, package_id, staff_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO customer_sessions (client_name, client_contact, package_id, staff_id) VALUES (?, ?, ?, ?)`,
      [client_name, client_contact, package_id, staff_id || 1]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error saving transaction:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// End an Existing Session
app.post('/api/sessions/:id/end', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE customer_sessions SET end_time = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error ending session transaction:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Catch-all route to serve the login index page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/* ==========================================
    🚀 APPLICATION ENGINE SPIN UP
========================================== */
const PORT = process.env.PORT || 8080;

// Force verification sequence BEFORE waking up the web app service listener
(async () => {
  const dbReady = await initializeDatabase();
  
  if (dbReady) {
    app.listen(PORT, () => {
      console.log(`🚀 Server fully operational and running live on port ${PORT}`);
    });
  } else {
    console.error("🛑 Server boot halted: Unable to verify essential MySQL database schemas.");
    process.exit(1);
  }
})();