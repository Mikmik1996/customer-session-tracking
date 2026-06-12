const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'customer_tracking',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Routes

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const connection = await pool.getConnection();
    
    const [rows] = await connection.query(
      'SELECT id, username, name FROM staff WHERE username = ? AND password = ?',
      [username, password]
    );
    
    connection.release();
    
    if (rows.length > 0) {
      res.json({ success: true, staff: rows[0] });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all packages
app.get('/api/packages', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [packages] = await connection.query('SELECT * FROM packages ORDER BY duration_minutes ASC');
    connection.release();
    res.json(packages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new session
app.post('/api/sessions', async (req, res) => {
  try {
    const { client_name, client_contact, package_id, staff_id } = req.body;
    const connection = await pool.getConnection();
    
    const [result] = await connection.query(
      'INSERT INTO sessions (client_name, client_contact, package_id, staff_id, start_time, status) VALUES (?, ?, ?, ?, NOW(), "active")',
      [client_name, client_contact, package_id, staff_id]
    );
    
    connection.release();
    res.json({ success: true, sessionId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get active sessions
app.get('/api/sessions/active', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [sessions] = await connection.query(`
      SELECT s.*, p.name as package_name, p.duration_minutes, st.name as staff_name
      FROM sessions s
      JOIN packages p ON s.package_id = p.id
      JOIN staff st ON s.staff_id = st.id
      WHERE s.status = 'active'
      ORDER BY s.start_time DESC
    `);
    
    connection.release();
    
    // Calculate remaining time for each session
    const sessionsWithTime = sessions.map(session => {
      const startTime = new Date(session.start_time);
      const elapsedMinutes = Math.floor((new Date() - startTime) / 60000);
      const remainingMinutes = session.duration_minutes - elapsedMinutes;
      
      return {
        ...session,
        elapsed_minutes: elapsedMinutes,
        remaining_minutes: Math.max(0, remainingMinutes),
        is_expired: remainingMinutes <= 0
      };
    });
    
    res.json(sessionsWithTime);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all sessions (for dashboard/reports)
app.get('/api/sessions', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [sessions] = await connection.query(`
      SELECT s.*, p.name as package_name, p.duration_minutes, st.name as staff_name
      FROM sessions s
      JOIN packages p ON s.package_id = p.id
      JOIN staff st ON s.staff_id = st.id
      ORDER BY s.start_time DESC
      LIMIT 100
    `);
    
    connection.release();
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End session (mark as completed)
app.post('/api/sessions/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    await connection.query(
      'UPDATE sessions SET status = "completed", end_time = NOW() WHERE id = ?',
      [id]
    );
    
    connection.release();
    res.json({ success: true, message: 'Session ended' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get count of people inside (active sessions)
app.get('/api/count/inside', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'SELECT COUNT(*) as count FROM sessions WHERE status = "active"'
    );
    connection.release();
    res.json({ count: result[0].count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get statistics (for dashboard)
app.get('/api/statistics', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [totalSessions] = await connection.query('SELECT COUNT(*) as count FROM sessions');
    const [activeSessions] = await connection.query('SELECT COUNT(*) as count FROM sessions WHERE status = "active"');
    const [completedSessions] = await connection.query('SELECT COUNT(*) as count FROM sessions WHERE status = "completed"');
    
    connection.release();
    
    res.json({
      total: totalSessions[0].count,
      active: activeSessions[0].count,
      completed: completedSessions[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Customer Session Tracking Server running on http://localhost:${PORT}`);
  console.log(`📊 Frontend available at: Open frontend/index.html in browser`);
  console.log(`💾 Make sure MySQL is running and database is configured`);
});
