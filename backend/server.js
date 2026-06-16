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
   🎯 DATABASE CONFIGURATION (RAILWAY POOL)
========================================== */
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || "localhost",
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "",
  database: process.env.MYSQLDATABASE || "wiijum_db",
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connectivity immediately upon initialization
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("🚀 DATABASE CONNECTED SUCCESSFULLY TO RAILWAY MYSQL POOL!");
    connection.release();
  } catch (err) {
    console.error("⚠️ Database connection error. Operating in local fallback mode:", err.message);
  }
})();

/* ==========================================
   🔑 USER ACCESS & FAILSAFE AUTHENTICATION
========================================== */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`🔑 Login validation checkpoint for: ${username}`);

  // Hardcoded Master Admin Override Bypass
  if (username === "admin" && password === "jump123") {
    console.log("🎯 Access granted via hardcoded administrator bypass.");
    return res.json({ success: true });
  }

  try {
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
    // Queries only open customer track sessions that haven't been manually deleted/ended
    const [rows] = await pool.query(
      "SELECT * FROM customer_sessions WHERE end_time IS NULL ORDER BY start_time DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching active panel layout row items:", err.message);
    res.status(500).json({ error: "Failed to load active tracking rows" });
  }
});

/* ==========================================
   ➕ CREATE NEW SESSIONS
========================================== */
app.post("/api/sessions", async (req, res) => {
  const { client_name, client_contact, package_id, staff_id } = req.body;
  try {
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
   📈 ANALYTICS CHART METRICS (FILTER READY)
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
      ENDFOR AS package_name,
      COUNT(*) AS count 
    FROM customer_sessions
  `;
  
  const params = [];
  
  // Convert standard UTC raw timestamps directly into Manila local business dates
  if (start && end) {
    sql += " WHERE DATE(CONVERT_TZ(start_time, '+00:00', '+08:00')) BETWEEN ? AND ? ";
    params.push(start, end);
  }
  
  sql += " GROUP BY package_id ORDER BY package_id ASC";

  // Clean up standard SQL keyword generation formatting conflicts
  const sanitizedSql = sql.replace("ENDFOR AS package_name", "END AS package_name");

  try {
    const [rows] = await pool.query(sanitizedSql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Analytics aggregator compilation failed:", err.message);
    res.status(500).json([]);
  }
});

/* ==========================================
   📥 EXPORT LOGS ROUTE (FILTERS COMPATIBLE)
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