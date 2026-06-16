// 🔥 MUST BE AT TOP
console.log("🔥 BACKEND FILE IS RUNNING 🔥");

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend")));

// ✅ FIXED DATABASE CONNECTION (MANUAL CLUSTER FALLBACKS TO PREVENT 127.0.0.1 CRASHES)
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.MYSQL_HOST || "mysql.railway.internal",
  user: process.env.MYSQLUSER || process.env.MYSQL_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || "mfEHOcBYWiLNyWmtQgFJfqQjjKVOetrK",
  database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || "railway",
  port: parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ✅ TEST DATABASE CONNECTION
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL Database Server Successfully.");
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
   ✅ EXPORT CSV (WITH DATE FILTERING SUPPORT)
=========================== */
app.get("/api/export", async (req, res) => {
  try {
    const { start, end } = req.query;
    
    // Build explicit filtering query conditions for Manila Timezone boundary blocks
    let sql = `SELECT client_name, client_contact, package_id, start_time, end_time FROM sessions`;
    let params = [];

    if (start && end) {
      sql += ` WHERE CONVERT_TZ(start_time, '+00:00', '+08:00') BETWEEN ? AND ?`;
      params.push(`${start} 00:00:00`, `${end} 23:59:59`);
    }
    
    sql += ` ORDER BY start_time DESC`;
    const [rows] = await pool.query(sql, params);

    const cleanedRows = rows.map(row => {
      const startDate = new Date(row.start_time);
      
      let packageName = "Unknown";
      let durationMins = 30;
      if (row.package_id == 1) { packageName = "30 mins"; durationMins = 30; }
      else if (row.package_id == 2) { packageName = "1 hour"; durationMins = 60; }
      else if (row.package_id == 3) { packageName = "1.5 hours"; durationMins = 90; }
      else if (row.package_id == 4) { packageName = "2 hours"; durationMins = 120; }
      else { packageName = "Unlimited"; durationMins = 999; }

      const dateString = startDate.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });

      const startTimeString = startDate.toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      let endTimeString = "-";
      if (durationMins < 999) {
        const endDate = new Date(startDate.getTime() + durationMins * 60000);
        endTimeString = endDate.toLocaleTimeString("en-PH", {
          timeZone: "Asia/Manila",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        });
      } else if (row.end_time) {
        const removeDate = new Date(row.end_time);
        endTimeString = removeDate.toLocaleTimeString("en-PH", {
          timeZone: "Asia/Manila",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        });
      }

      return {
        date: dateString,
        name: row.client_name || "N/A",
        contact: row.client_contact || "N/A",
        package: packageName,
        start: startTimeString,
        end: endTimeString
      };
    });

    const headers = ["Date", "Customer Name", "Contact Number", "Package", "Start Time", "End Time"];
    let csvContent = headers.join(",") + "\n";

    cleanedRows.forEach(r => {
      const cleanName = String(r.name).replace(/"/g, '""');
      const cleanContact = String(r.contact).replace(/"/g, '""');
      
      const line = [
        `"${r.date}"`,
        `"${cleanName}"`,
        `"${cleanContact}"`,
        `"${r.package}"`,
        `"${r.start}"`,
        `"${r.end}"`
      ].join(",");
      csvContent += line + "\n";
    });

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.header("Content-Type", "text/csv");
    res.attachment("session_report.csv");
    res.send(csvContent);

  } catch (err) {
    console.error("❌ Export error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   ✅ CHART DATA (WITH DATE FILTERING & DUPLICATE UNLIMITED FIX)
=========================== */
app.get("/api/chart-data", async (req, res) => {
  try {
    const { start, end } = req.query;

    let sql = `
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
    
    let params = [];
    if (start && end) {
      // Filter cleanly converting UTC system timestamps to localized Manila context strings
      sql += ` WHERE CONVERT_TZ(start_time, '+00:00', '+08:00') BETWEEN ? AND ?`;
      params.push(`${start} 00:00:00`, `${end} 23:59:59`);
    }

    // Explicitly group cleanly by the string outcome name to eliminate duplicate Unlimited bar fragmentation!
    sql += `
      GROUP BY 
        CASE 
          WHEN package_id = 1 THEN '30 mins'
          WHEN package_id = 2 THEN '1 hour'
          WHEN package_id = 3 THEN '1.5 hours'
          WHEN package_id = 4 THEN '2 hours'
          ELSE 'Unlimited'
        END
    `;

    const [rows] = await pool.query(sql, params);
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
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

/* ===========================
   🚀 START SERVER
=========================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});