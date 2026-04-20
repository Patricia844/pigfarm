-- Database setup for Pig Farm application
-- Run this script to initialize the database

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS pigfarm_db;
USE pigfarm_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'worker') DEFAULT 'worker',
    phone VARCHAR(20),
    farm_name VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login DATETIME,
    login_attempts INT DEFAULT 0,
    locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Breeds table
CREATE TABLE IF NOT EXISTS breeds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- Boars table
CREATE TABLE IF NOT EXISTS boars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    breed_id INT,
    birth_date DATE,
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    notes TEXT,
    status ENUM('active', 'resting', 'sold', 'deceased') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (breed_id) REFERENCES breeds(id)
);

-- Sows table
CREATE TABLE IF NOT EXISTS sows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    breed_id INT,
    birth_date DATE,
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    identification_marks TEXT,
    notes TEXT,
    status ENUM('active', 'sold', 'culled', 'deceased') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (breed_id) REFERENCES breeds(id)
);

-- Litters table
CREATE TABLE IF NOT EXISTS litters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sow_id INT NOT NULL,
    farrowing_date DATE NOT NULL,
    total_born INT DEFAULT 0,
    born_alive INT DEFAULT 0,
    stillborn INT DEFAULT 0,
    mummified INT DEFAULT 0,
    weaning_date DATE,
    notes TEXT,
    parity_number INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sow_id) REFERENCES sows(id)
);

-- Litter weights table
CREATE TABLE IF NOT EXISTS litter_weights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    litter_id INT NOT NULL,
    weight_date DATE NOT NULL,
    weight_kg DECIMAL(5,2),
    weight_type ENUM('birth', 'weaning', 'other') DEFAULT 'birth',
    notes TEXT,
    FOREIGN KEY (litter_id) REFERENCES litters(id)
);

-- Litter mortality table
CREATE TABLE IF NOT EXISTS litter_mortality (
    id INT AUTO_INCREMENT PRIMARY KEY,
    litter_id INT NOT NULL,
    death_date DATE NOT NULL,
    number_died INT DEFAULT 1,
    cause VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (litter_id) REFERENCES litters(id)
);

-- Litter timeline table
CREATE TABLE IF NOT EXISTS litter_timeline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    litter_id INT NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(50),
    event_title VARCHAR(255),
    event_description TEXT,
    FOREIGN KEY (litter_id) REFERENCES litters(id)
);

-- Litter alerts table
CREATE TABLE IF NOT EXISTS litter_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    litter_id INT NOT NULL,
    alert_type VARCHAR(50),
    alert_message TEXT,
    alert_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (litter_id) REFERENCES litters(id)
);

-- Litter health table
CREATE TABLE IF NOT EXISTS litter_health (
    id INT AUTO_INCREMENT PRIMARY KEY,
    litter_id INT NOT NULL,
    record_date DATE NOT NULL,
    record_type VARCHAR(50),
    diagnosis TEXT,
    medication VARCHAR(255),
    dosage VARCHAR(100),
    administered_by VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (litter_id) REFERENCES litters(id)
);

-- Cross fostering table
CREATE TABLE IF NOT EXISTS cross_fostering (
    id INT AUTO_INCREMENT PRIMARY KEY,
    litter_id INT NOT NULL,
    from_litter_id INT,
    to_litter_id INT,
    piglets_count INT,
    fostering_date DATE,
    reason TEXT,
    notes TEXT,
    FOREIGN KEY (litter_id) REFERENCES litters(id),
    FOREIGN KEY (from_litter_id) REFERENCES litters(id),
    FOREIGN KEY (to_litter_id) REFERENCES litters(id)
);

-- Health records table
CREATE TABLE IF NOT EXISTS health_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    animal_id INT NOT NULL,
    animal_type ENUM('sow', 'piglet') DEFAULT 'sow',
    date_administered DATE NOT NULL,
    record_type VARCHAR(50),
    diagnosis TEXT,
    medication VARCHAR(255),
    dosage VARCHAR(100),
    administered_by VARCHAR(255),
    notes TEXT,
    cost DECIMAL(10,2),
    follow_up_date DATE
);

-- Feed inventory table
CREATE TABLE IF NOT EXISTS feed_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feed_type VARCHAR(255) NOT NULL,
    feed_type_category VARCHAR(100),
    quantity_kg DECIMAL(10,2) DEFAULT 0,
    cost_per_kg DECIMAL(10,2),
    purchase_date DATE,
    supplier VARCHAR(255),
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    reorder_quantity DECIMAL(10,2),
    last_restocked DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feed purchases table
CREATE TABLE IF NOT EXISTS feed_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feed_id INT NOT NULL,
    purchase_date DATE NOT NULL,
    quantity_kg DECIMAL(10,2),
    cost_per_kg DECIMAL(10,2),
    supplier VARCHAR(255),
    FOREIGN KEY (feed_id) REFERENCES feed_inventory(id)
);

-- Feed allocations table
CREATE TABLE IF NOT EXISTS feed_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feed_id INT NOT NULL,
    allocation_date DATE NOT NULL,
    quantity_kg DECIMAL(10,2),
    feeding_time TIME,
    allocated_to_type ENUM('sow', 'litter', 'boar', 'other'),
    allocated_to_id INT,
    allocated_to_name VARCHAR(255),
    cost_at_time DECIMAL(10,2),
    notes TEXT,
    FOREIGN KEY (feed_id) REFERENCES feed_inventory(id)
);

-- Feed alerts table
CREATE TABLE IF NOT EXISTS feed_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feed_id INT NOT NULL,
    alert_type VARCHAR(50),
    alert_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feed_id) REFERENCES feed_inventory(id)
);

-- Feed timeline table
CREATE TABLE IF NOT EXISTS feed_timeline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(50),
    feed_id INT,
    quantity_kg DECIMAL(10,2),
    description TEXT,
    FOREIGN KEY (feed_id) REFERENCES feed_inventory(id)
);

-- Insert some sample data
INSERT INTO breeds (name, description) VALUES 
('Large White', 'Common commercial breed'),
('Landrace', 'Known for prolificacy'),
('Duroc', 'Red breed known for meat quality');

-- Insert sample user (admin)
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@pigfarm.com', '$2a$10$example.hash.here', 'admin');