// 🛠️ Robust Database Table Migrator
async function ensureTablesExist() {
  if (tablesReady) return true;
  
  let connection;
  try {
    connection = await pool.getConnection();
    
    // 1. Create Staff Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create Packages Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL,
        duration_minutes INT NOT NULL,
        price DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Sessions Table (Depends on Staff and Packages)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        client_name VARCHAR(100) NOT NULL,
        client_contact VARCHAR(20) NOT NULL,
        package_id INT NOT NULL,
        staff_id INT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (package_id) REFERENCES packages(id),
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      );
    `);

    // 4. Seed default data if packages are completely empty
    const [rows] = await connection.query("SELECT COUNT(*) as count FROM packages");
    if (rows[0].count === 0) {
      await connection.query(`
        INSERT INTO packages (name, duration_minutes, price) VALUES
        ('30 Minutes', 30, 50),
        ('1 Hour', 60, 80),
        ('1.5 Hours', 90, 110),
        ('2 Hours', 120, 140),
        ('Unlimited', 999999, 200);
      `);
      
      await connection.query(`
        INSERT INTO staff (username, password, name) VALUES
        ('admin', 'jump123', 'Administrator');
      `);
      console.log("🌱 Database seeded with default packages and admin credentials.");
    }

    console.log("🎯 All structural relational tables verified/created successfully.");
    tablesReady = true;
    return true;
  } catch (err) {
    console.error("❌ Critical layout table migrator execution failure:", err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}