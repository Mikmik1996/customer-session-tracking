console.log("🔥 BACKEND FILE IS RUNNING 🔥");

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cors());

// ✅ SERVE FRONTEND
app.use(express.static("frontend"));



// ✅ DATABASE CONNECTION (FINAL)


const dbUrl = process.env.MYSQL_URL;

if (!dbUrl) {
  throw new Error("❌ MYSQL_URL is missing from environment variables");
}

const parsed = new URL(dbUrl);

const pool = mysql.createPool({
  host: parsed.hostname,
  user: parsed.username,
  password: parsed.password,
  database: parsed.pathname.replace("/", ""),
  port: parsed.port || 3306,
})


// ✅ TEST DATABASE CONNECTION (safe)
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
   ✅ EXPORT CSV
=========================== */
app.get("/api/export", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT client_name, client_contact, start_time, end_time
      FROM sessions
    `);

    let csv = "Name,Contact,Start Time,End Time\n";

    rows.forEach(row => {
      csv += `${row.client_name},${row.client_contact},${row.start_time},${row.end_time || ""}\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment("report.csv");
    res.send(csv);

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
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

/* ===========================
   ✅ START SERVER
=========================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
``