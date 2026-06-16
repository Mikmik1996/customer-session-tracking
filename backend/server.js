require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS and parsing middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Dynamic Database Connection Pool Setup
// Prioritizes Railway's native production variables, falling back to your local .env configurations
const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'customer_tracking',
    port: process.env.MYSQLPORT || process.env.DB_PORT || 3306
});

// Self-healing database initialization for Railway production environment
db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        session_start DATETIME NOT NULL,
        session_end DATETIME,
        duration_minutes INT,
        status VARCHAR(50) DEFAULT 'Active'
    );
`, (err) => {
    if (err) {
        console.error("Database connection/initialization failed:", err.message);
        console.error("Check your Railway environment variables if this is running in production.");
    } else {
        console.log("Database connected and sessions table verified successfully.");
    }
});

// Get all tracking sessions
app.get('/api/sessions', (req, res) => {
    db.query('SELECT * FROM sessions ORDER BY session_start DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Start a new customer tracking session
app.post('/api/sessions', (req, res) => {
    const { customer_id, session_start } = req.body;
    const query = 'INSERT INTO sessions (customer_id, session_start, status) VALUES (?, ?, ?)';
    
    db.query(query, [customer_id, session_start, 'Active'], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: result.insertId, customer_id, session_start, status: 'Active' });
    });
});

// Complete/End an active session
app.put('/api/sessions/:id', (req, res) => {
    const { id } = req.params;
    const { session_end, duration_minutes, status } = req.body;
    const query = 'UPDATE sessions SET session_end = ?, duration_minutes = ?, status = ? WHERE id = ?';
    
    db.query(query, [session_end, duration_minutes, status, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Session updated successfully' });
    });
});

// Export all sessions data to CSV format
app.get('/api/export', (req, res) => {
    db.query('SELECT * FROM sessions ORDER BY session_start DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        let csv = 'ID,Customer ID,Session Start,Session End,Duration (Min),Status\n';
        results.forEach(row => {
            csv += `${row.id},"${row.customer_id}",${row.session_start},${row.session_end || ''},${row.duration_minutes || ''},${row.status}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sessions_export.csv');
        res.status(200).send(csv);
    });
});

// Fallback to serve your index.html page
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});