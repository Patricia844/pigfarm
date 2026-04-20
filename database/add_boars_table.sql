USE pigfarm_db;

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