# Customer Session Tracking System - Setup Guide

## 📋 Prerequisites

Before you start, make sure you have installed:
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v5.7 or higher) - [Download here](https://www.mysql.com/downloads/)
- **Git** - [Download here](https://git-scm.com/)

## 🚀 Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/Mikmik1996/customer-session-tracking.git
cd customer-session-tracking
```

### Step 2: Set Up the Database

1. **Open MySQL Command Line or MySQL Workbench**

2. **Run the database schema:**
   ```bash
   mysql -u root -p < backend/database.sql
   ```
   
   Or copy the contents of `backend/database.sql` and paste it into MySQL GUI

3. **Verify the database was created:**
   ```sql
   USE customer_tracking;
   SHOW TABLES;
   ```

### Step 3: Configure Backend

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Copy `.env.example` to `.env`:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file with your database credentials:**
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=customer_tracking
   PORT=3000
   JWT_SECRET=your-secret-key
   NODE_ENV=development
   ```

4. **Install Node dependencies:**
   ```bash
   npm install
   ```

### Step 4: Start the Backend Server

```bash
node server.js
```

You should see:
```
🚀 Customer Session Tracking Server running on http://localhost:3000
📊 Frontend available at: Open frontend/index.html in browser
💾 Make sure MySQL is running and database is configured
```

### Step 5: Open the Frontend

1. **Option A: Open directly in browser**
   - Navigate to the `frontend` folder
   - Right-click on `index.html`
   - Select "Open with" → Your preferred browser

2. **Option B: Use a local server (recommended)**
   - In a new terminal, navigate to the project root
   - Run: `python -m http.server 8000` (or use any other simple HTTP server)
   - Open: `http://localhost:8000/frontend/index.html`

## 🔑 Login Credentials

Use these demo credentials to log in:

- **Username:** `staff`
- **Password:** `123456`

## 📁 Project Structure

```
customer-session-tracking/
├── frontend/
│   ├── index.html              # Login page
│   ├── dashboard.html          # Staff dashboard (add customers)
│   ├── admin-dashboard.html    # Admin panel (view records & reports)
│   ├── css/
│   │   └── style.css           # Styling
│   └── js/
│       └── script.js           # Frontend logic
├── backend/
│   ├── server.js               # Express server
│   ├── package.json            # Node dependencies
│   ├── database.sql            # MySQL schema
│   └── .env.example            # Environment variables template
├── README.md                   # Project documentation
└── SETUP.md                    # This file
```

## 🛠️ Usage Guide

### 1. **Login Page** (`index.html`)
   - Enter staff username and password
   - Click "Login" button
   - Redirects to staff dashboard

### 2. **Staff Dashboard** (`dashboard.html`)
   - **Add Customer:** Enter customer name and optional ID, click "Record Entry"
   - **View Active Customers:** See all customers currently in the park
   - **Exit Customer:** Click "Exit" button to mark customer as leaving
   - **Search:** Use search box to find specific customers
   - **Statistics:** View real-time stats (total active, today's entries, average duration)

### 3. **Admin Dashboard** (`admin-dashboard.html`)
   - **Filter Records:** Filter by date and search by customer name
   - **View All Records:** See complete history of all customer entries
   - **Download Report:** Export customer data as CSV file
   - **Statistics:** View summary statistics (total entries, active customers, average duration)

## 🐛 Troubleshooting

### Issue: "Cannot connect to localhost:3000"
- **Solution:** Make sure the backend server is running (`node server.js`)

### Issue: "Database connection error"
- **Solution:** 
  - Verify MySQL is running
  - Check database credentials in `.env` file
  - Run `backend/database.sql` to create tables

### Issue: "Login page shows error"
- **Solution:**
  - Open browser console (F12) to see error messages
  - Make sure backend server is running
  - Check that you're using correct credentials (staff/123456)

### Issue: "CORS error"
- **Solution:** This is normal during development. The backend already has CORS enabled.

## 🔐 Security Notes

⚠️ **For Production Use:**
- Change the default staff password
- Generate a new JWT_SECRET
- Use environment variables for sensitive data
- Enable HTTPS
- Add rate limiting
- Implement input validation
- Use a proper authentication system

## 📝 Adding New Staff Members

1. Open MySQL
2. Run this command:
   ```sql
   INSERT INTO staff (username, password, email) VALUES 
   ('newuser', '$2a$10$...bcrypt_hash...', 'newuser@wiijump.com');
   ```

To generate a bcrypt hash for a password, run this in Node.js:
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hashSync('password123', 10)
```

## 📞 Support

For issues or questions:
1. Check the README.md file
2. Review error messages in browser console (F12)
3. Check backend logs in terminal
4. Verify all prerequisites are installed

## 📅 Features Implemented

✅ Staff Login/Authentication
✅ Record Customer Entry with Timestamp
✅ View Active Customers
✅ Mark Customer Exit
✅ Dashboard with Live Stats
✅ Admin Panel with History
✅ Filter Records by Date
✅ Search Functionality
✅ Download Report (CSV)
✅ Responsive Design

## 🎯 Future Enhancements

- Email notifications
- SMS alerts
- Photo/ID scanning
- Payment integration
- Advanced analytics
- Mobile app version
- QR code integration
- Capacity management

---

**Created for Wiijump Philippines** 🏀
