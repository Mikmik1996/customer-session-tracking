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

// ✅ DATABASE CONNECTION (DYNAMIC)
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || "mysql.railway.internal",
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "mfEHOcBYWiLNyWmtQgFJfqQjjKVOetrK", // fallback for local testing
  database: process.env.MYSQLDATABASE || "railway",
  port: parseInt(process.env.MYSQLPORT || "3306")
});

// ✅ TEST CONNECTION (OPTIONAL BUT SAFE)
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL");
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
   ✅ EXPORT CSV (CLEAN & DYNAMIC UNLIMITED TIMES)
=========================== */
app.get("/api/export", async (req, res) => {
  try {
    // 1. Pull package_id alongside metadata to calculate true standard limits vs unlimited drops
    const [rows] = await pool.query(`
      SELECT client_name, client_contact, package_id, start_time, end_time
      FROM sessions
      ORDER BY start_time DESC
    `);

    // 2. Clean row arrays into formatted strings mapped to Asia/Manila 
    const cleanedRows = rows.map(row => {
      const startDate = new Date(row.start_time);
      
      // Setup dynamic package names and calculate duration thresholds
      let packageName = "Unknown";
      let durationMins = 30;
      if (row.package_id == 1) { packageName = "30 mins"; durationMins = 30; }
      else if (row.package_id == 2) { packageName = "1 hour"; durationMins = 60; }
      else if (row.package_id == 3) { packageName = "1.5 hours"; durationMins = 90; }
      else if (row.package_id == 4) { packageName = "2 hours"; durationMins = 120; }
      else if (row.package_id == 5) { packageName = "Unlimited"; durationMins = 999; }

      // Date Layout: MM/DD/YYYY cleanly parsed for the PH
      const dateString = startDate.toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });

      // Start Time Layout: HH:MM:SS AM/PM
      const startTimeString = startDate.toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      // Target clean End Time layouts dynamically
      let endTimeString = "-";
      if (durationMins < 999) {
        // Standard package: Render explicit mathematically expected termination mark
        const endDate = new Date(startDate.getTime() + durationMins * 60000);
        endTimeString = endDate.toLocaleTimeString("en-PH", {
          timeZone: "Asia/Manila",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        });
      } else if (row.end_time) {
        // Unlimited package: Fetch timestamp generated when "Remove" button was clicked
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
        name: row.client_name,
        contact: row.client_contact || "N/A",
        package: packageName,
        start: startTimeString,
        end: endTimeString
      };
    });

    // 3. Define the explicit columns requested
    const headers = ["Date", "Customer Name", "Contact Number", "Package", "Start Time", "End Time"];
    let csvContent = headers.join(",") + "\n";

    // 4. Construct the clean file while wrapping text inside quotes to protect commas
    cleanedRows.forEach(r => {
      const line = [
        `"${r.date}"`,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.contact.replace(/"/g, '""')}"`,
        `"${r.package}"`,
        `"${r.start}"`,
        `"${r.end}"`
      ].join(",");
      csvContent += line + "\n";
    });

    // 5. Fire download attachment prompt straight to dashboard admin user panels
    res.header("Content-Type", "text/csv");
    res.attachment("session_report.csv");
    res.send(csvContent);

  } catch (err) {
    console.error("❌ Export error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===========================
   ✅ CHART DATA
=========================== */
app.get("/api/chart-data", async (req, res) => {
  try {
    const [rows] = await pool.query(`
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
      GROUP BY package_id
    `);

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
  console.log(`🚀 Server running on port ${PORT}`);
});