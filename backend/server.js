// 🔥 MUST BE AT TOP
console.log("🔥 BACKEND FILE IS RUNNING 🔥");

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// ✅ FIXED: Look one folder up out of the backend directory for the frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// ✅ FIXED DATABASE CONNECTION: Dynamic configurations prioritizing Railway Environment Variables
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || "mysql.railway.internal",
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "mfEHOcBYWiLNyWmtQgFJfqQjjKVOetrK",
  database: process.env.MYSQLDATABASE || "railway",
  port: parseInt(process.env.MYSQLPORT || "3306")
});

// ✅ TEST CONNECTION (OPTIONAL BUT SAFE)
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL Database");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err);
  }
})();

/* ===========================
   ✅ LOGIN
=========================== */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "jump123") {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

/* ===========================
   ✅ ADD SESSION
=========================== */
app.post("/api/sessions", async (req, res) => {
  try {
    const { client_name, client_contact, package_id, staff_id } = req.body;

    await pool.query(
      `INSERT INTO sessions 
      (client_name, client_contact, package_id, staff_id, start_time)
      VALUES (?, ?, ?, ?, NOW())`,
      [client_name, client_contact, package_id, staff_id || 1]
    );

    console.log("✅ Session created");
    res.json({ success: true });

  } catch (err) {
    console.error("❌ Add session error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   ✅ ACTIVE SESSIONS
=========================== */
app.get("/api/sessions/active", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, client_name, start_time, package_id
      FROM sessions
      WHERE end_time IS NULL
    `);

    res.json(rows);

  } catch (err) {
    console.error("❌ Active sessions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   ✅ END SESSION
=========================== */
app.post("/api/sessions/:id/end", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "UPDATE sessions SET end_time = NOW() WHERE id = ?",
      [id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("❌ End session error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   ✅ REMOVE EXPIRED SESSIONS
=========================== */
app.post("/api/sessions/remove-expired", async (req, res) => {
  try {

    await pool.query(`
      UPDATE sessions
      SET end_time = NOW()
      WHERE end_time IS NULL
      AND package_id <> 5
      AND (
        (package_id = 1 AND TIMESTAMPDIFF(MINUTE,start_time,NOW()) >= 30)
        OR
        (package_id = 2 AND TIMESTAMPDIFF(MINUTE,start_time,NOW()) >= 60)
        OR
        (package_id = 3 AND TIMESTAMPDIFF(MINUTE,start_time,NOW()) >= 90)
        OR
        (package_id = 4 AND TIMESTAMPDIFF(MINUTE,start_time,NOW()) >= 120)
      )
    `);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ Remove expired error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   ✅ EXPORT CSV
=========================== */
app.get("/api/export", async (req, res) => {
  try {
    const { start, end } = req.query;

    let query = `
      SELECT
        DATE_FORMAT(start_time, '%Y-%m-%d') AS session_date,
        client_name,
        client_contact,

        CASE
          WHEN package_id = 1 THEN '30 mins'
          WHEN package_id = 2 THEN '1 hour'
          WHEN package_id = 3 THEN '1.5 hours'
          WHEN package_id = 4 THEN '2 hours'
          ELSE 'Unlimited'
        END AS package_name,

        TIME_FORMAT(start_time, '%h:%i %p') AS time_in,

        TIME_FORMAT(
          CASE
            WHEN package_id = 1 THEN DATE_ADD(start_time, INTERVAL 30 MINUTE)
            WHEN package_id = 2 THEN DATE_ADD(start_time, INTERVAL 60 MINUTE)
            WHEN package_id = 3 THEN DATE_ADD(start_time, INTERVAL 90 MINUTE)
            WHEN package_id = 4 THEN DATE_ADD(start_time, INTERVAL 120 MINUTE)
            ELSE end_time
          END,
          '%h:%i %p'
        ) AS time_out

      FROM sessions
    `;

    const params = [];

    if (start && end) {
      query += `
        WHERE DATE(start_time) BETWEEN ? AND ?
      `;
      params.push(start, end);
    }

    query += `
      ORDER BY start_time DESC
    `;

    const [rows] = await pool.query(query, params);

    let csv =
      "Date,Customer Name,Contact,Session Package,Time In,Time Out\n";

    rows.forEach(row => {
      csv += `"${row.session_date}","${row.client_name}","${row.client_contact || ""}","${row.package_name}","${row.time_in || ""}","${row.time_out || ""}"\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment("report.csv");
    res.send(csv);

  } catch (err) {
    console.error("❌ Export error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
``
/* ===========================
   ✅ CHART DATA WITH FILTER
=========================== */
app.get("/api/chart-data", async (req, res) => {
  try {
    const { start, end } = req.query;

    let query = `
      SELECT 
        CASE 
          WHEN package_id = 1 THEN '30 mins'
          WHEN package_id = 2 THEN '1 hour'
          WHEN package_id = 3 THEN '1.5 hours'
          WHEN package_id = 4 THEN '2 hours'
          ELSE 'Unlimited'
        END AS package_name,
        COUNT(*) AS count
      FROM sessions
    `;

    const params = [];

    if (start && end) {
      query += `
        WHERE DATE(start_time) BETWEEN ? AND ?
      `;
      params.push(start, end);
    }

    query += `
      GROUP BY package_id
    `;

    const [rows] = await pool.query(query, params);

    res.json(rows);

  } catch (err) {
    console.error("❌ Chart error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   ✅ FRONTEND ROUTE (LAST)
=========================== */
app.get("*", (req, res) => {
  // ✅ FIXED: Look one folder up out of backend to find frontend/index.html
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* ===========================
   ✅ START SERVER
=========================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});