# Customer Session Tracking System
## Wiijump Philippines

A digital time-logging system for tracking customer entries at the trampoline park with timestamps, live dashboard, and admin reporting.

---

## 📋 Features

- ✅ **Staff Login** - Secure authentication for staff members
- ✅ **Customer Entry Recording** - Log customer entries with auto-timestamp
- ✅ **Live Dashboard** - View active customers and their session duration
- ✅ **Admin Panel** - View all customer records and history
- ✅ **Report Download** - Export customer data as CSV
- ✅ **Simple Interface** - Easy-to-use HTML/CSS/JavaScript frontend

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Basic)
- **Backend:** Node.js with Express.js
- **Database:** MySQL
- **Structure:** Monorepo (frontend & backend in one repo)

---

## 📁 Project Structure

```
customer-session-tracking/
├── frontend/                 # Frontend HTML/CSS/JS files
│   ├── index.html           # Login page
│   ├── dashboard.html       # Staff dashboard (add customers)
│   ├── admin-dashboard.html # Admin panel (view records & reports)
│   ├── css/
│   │   └── style.css        # Main stylesheet
│   └── js/
│       └── script.js        # JavaScript logic
├── backend/                 # Node.js/Express backend
│   ├── server.js            # Main server file
│   ├── config.js            # Database configuration
│   ├── database.sql         # MySQL schema
│   ├── package.json         # Node dependencies
│   └── routes/
│       └── api.js           # API routes
├── .gitignore              # Git ignore file
└── README.md               # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- MySQL installed and running
- Git installed

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mikmik1996/customer-session-tracking.git
   cd customer-session-tracking
   ```

2. **Set up the database:**
   - Open MySQL and run the SQL commands from `backend/database.sql`
   - Update database credentials in `backend/config.js`

3. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

4. **Start the server:**
   ```bash
   node server.js
   ```
   Server will run on `http://localhost:3000`

5. **Open the frontend:**
   - Open `frontend/index.html` in your browser
   - Or navigate to `http://localhost:3000`

---

## 📝 Usage

1. **Login:** Use staff credentials to log in
2. **Add Customer:** Record new customer entries with timestamp
3. **View Dashboard:** See active customers and session duration
4. **Admin Panel:** Review all records and download reports

---

## 📊 Database Schema

### Customers Table
- `id` - Customer ID (Primary Key)
- `name` - Customer name
- `entry_time` - Entry timestamp
- `exit_time` - Exit timestamp (nullable)
- `duration` - Session duration in minutes

### Staff Table
- `id` - Staff ID (Primary Key)
- `username` - Staff username
- `password` - Staff password (hashed)
- `email` - Staff email

---

## 👨‍💻 Author
Created for Wiijump Philippines Customer Tracking System

---

## 📄 License
This project is for educational/business purposes.

