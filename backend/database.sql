-- Create Database
CREATE DATABASE IF NOT EXISTS customer_tracking;
USE customer_tracking;

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packages Table
CREATE TABLE IF NOT EXISTS packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  duration_minutes INT NOT NULL,
  price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table (Active and Completed)
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

-- Insert Default Packages
INSERT INTO packages (name, duration_minutes, price) VALUES
('30 Minutes', 30, 50),
('1 Hour', 60, 80),
('1.5 Hours', 90, 110),
('2 Hours', 120, 140),
('Unlimited', 999999, 200);

-- Insert Demo Staff Account (password: 123456)
INSERT INTO staff (username, password, name) VALUES
('staff', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DRcT34', 'Demo Staff');

-- Create index for faster queries
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_staff_id ON sessions(staff_id);
