const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection with SSL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false  // For Aiven free tier
    }
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ MySQL connected successfully');
    }
});

// ============= TEST ROUTE =============
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend working!' });
});

// ============= AUTH ROUTES =============
// Register (always creates worker role)
app.post('/api/register', async (req, res) => {
    console.log('📝 Register attempt:', req.body.email);
    
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        // Check if user exists
        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('❌ Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Always create as worker (only admin can promote)
            db.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, 'worker'],
                (err, result) => {
                    if (err) {
                        console.error('❌ Insert error:', err);
                        return res.status(500).json({ error: 'Failed to create user' });
                    }
                    
                    // Create token
                    const token = jwt.sign(
                        { id: result.insertId, email, role: 'worker' },
                        process.env.JWT_SECRET || 'your-secret-key-2024',
                        { expiresIn: '7d' }
                    );
                    
                    console.log('✅ User registered as worker:', email);
                    
                    res.status(201).json({
                        token,
                        user: {
                            id: result.insertId,
                            name,
                            email,
                            role: 'worker'
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/login', (req, res) => {
    console.log('📝 Login attempt:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error('❌ DB Error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = results[0];
        console.log('✅ User found:', user.email, 'Role:', user.role);
        
        // Compare password
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key-2024',
            { expiresIn: '7d' }
        );
        
        console.log('✅ Login successful:', email, 'Role:', user.role);
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
});

// ============= USER MANAGEMENT ROUTES =============
// Helper to verify token and get user (used in many routes)
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-2024', (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.user = decoded;
        next();
    });
};

// Get all users (admin only)
app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    
    db.query(
        'SELECT id, name, email, role, phone, farm_name, status, last_login, login_attempts, locked, created_at FROM users ORDER BY created_at DESC',
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// Update user role (admin only)
app.put('/api/users/:id/role', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    
    const { role } = req.body;
    const validRoles = ['admin', 'farm_manager', 'veterinarian', 'worker'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    
    db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User role updated' });
    });
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User deleted' });
    });
});

// Update user profile (own profile)
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    const { name, email, phone, farm_name, address, city, province, postal_code, emergency_contact, preferences } = req.body;
    
    db.query(
        'UPDATE users SET name = ?, email = ?, phone = ?, farm_name = ?, preferences = ? WHERE id = ?',
        [name, email, phone, farm_name, JSON.stringify(preferences), req.user.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Profile updated' });
        }
    );
});

// Change password
app.put('/api/users/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    db.query('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: 'User not found' });
        
        const user = results[0];
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
        
        const hashed = await bcrypt.hash(newPassword, 10);
        db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Password changed' });
        });
    });
});

// ============= SOWS ROUTES =============
// Get all sows with breed name and litter count
app.get('/api/sows', (req, res) => {
    db.query(`
        SELECT s.*, b.name as breed_name,
               (SELECT COUNT(*) FROM litters WHERE sow_id = s.id) as litter_count
        FROM sows s
        LEFT JOIN breeds b ON s.breed_id = b.id
        ORDER BY s.created_at DESC
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add new sow
app.post('/api/sows', (req, res) => {
    const { tag_number, name, breed_id, birth_date, purchase_date, purchase_price, identification_marks, notes } = req.body;
    
    db.query(
        `INSERT INTO sows (tag_number, name, breed_id, birth_date, purchase_date, purchase_price, identification_marks, notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [tag_number, name, breed_id, birth_date, purchase_date, purchase_price, identification_marks, notes],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Tag number already exists' });
                console.error('❌ Error adding sow:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: result.insertId, message: 'Sow added' });
        }
    );
});

// Get single sow with full history
app.get('/api/sows/:id', (req, res) => {
    const sowId = req.params.id;
    
    db.query('SELECT * FROM sows WHERE id = ?', [sowId], (err, sowResult) => {
        if (err) return res.status(500).json({ error: err.message });
        if (sowResult.length === 0) return res.status(404).json({ error: 'Sow not found' });
        
        db.query('SELECT * FROM litters WHERE sow_id = ? ORDER BY farrowing_date DESC', [sowId], (err, litters) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.query('SELECT * FROM health_records WHERE animal_id = ? AND animal_type = "sow" ORDER BY date_administered DESC', [sowId], (err, health) => {
                if (err) return res.status(500).json({ error: err.message });
                
                res.json({
                    ...sowResult[0],
                    litters,
                    health_records: health
                });
            });
        });
    });
});

// Update sow status
app.put('/api/sows/:id/status', (req, res) => {
    const { status } = req.body;
    const validStatuses = ['active', 'pregnant', 'heat', 'sold', 'deceased'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    
    db.query('UPDATE sows SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Sow status updated' });
    });
});

// Update reproductive status
app.put('/api/sows/:id/reproductive', (req, res) => {
    const { reproductive_status, last_heat, last_breeding, expected_farrowing } = req.body;
    db.query(
        'UPDATE sows SET reproductive_status = ?, last_heat = ?, last_breeding = ?, expected_farrowing = ? WHERE id = ?',
        [reproductive_status, last_heat, last_breeding, expected_farrowing, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Reproductive status updated' });
        }
    );
});

// ============= LITTERS ROUTES (ENHANCED) =============
// Get all litters with summary
app.get('/api/litters', (req, res) => {
    const { limit } = req.query;
    let query = `
        SELECT l.*, s.tag_number as sow_tag, s.name as sow_name,
               (SELECT COUNT(*) FROM litter_mortality WHERE litter_id = l.id) as total_deaths,
               (SELECT SUM(number_died) FROM litter_mortality WHERE litter_id = l.id) as deaths_count,
               (SELECT AVG(weight_kg) FROM litter_weights WHERE litter_id = l.id AND weight_type = 'birth') as birth_weight_avg,
               (SELECT AVG(weight_kg) FROM litter_weights WHERE litter_id = l.id AND weight_type = 'current') as current_weight_avg,
               (SELECT AVG(weight_kg) FROM litter_weights WHERE litter_id = l.id AND weight_type = 'weaning') as weaning_weight_avg,
               CASE 
                   WHEN l.weaning_date IS NOT NULL THEN 'weaned'
                   WHEN l.farrowing_date IS NOT NULL THEN 'active'
                   ELSE 'pending'
               END as status
        FROM litters l
        JOIN sows s ON l.sow_id = s.id
        ORDER BY l.farrowing_date DESC
    `;
    if (limit) query += ' LIMIT ?';
    
    db.query(query, limit ? [parseInt(limit)] : [], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Enrich with calculated fields
        const enriched = results.map(litter => {
            const current_alive = litter.born_alive - (litter.deaths_count || 0);
            const survival_rate = litter.born_alive > 0 ? (current_alive / litter.born_alive * 100).toFixed(1) : 0;
            const mortality_rate = (100 - survival_rate).toFixed(1);
            const performance_score = Math.min(100, Math.round(
                (survival_rate * 0.6) + (litter.born_alive / 15 * 100 * 0.4)
            ));
            return {
                ...litter,
                current_alive,
                survival_rate: parseFloat(survival_rate),
                mortality_rate: parseFloat(mortality_rate),
                performance_score
            };
        });
        res.json(enriched);
    });
});

// Get single litter with all details
app.get('/api/litters/:id', (req, res) => {
    const litterId = req.params.id;
    
    db.query('SELECT l.*, s.tag_number as sow_tag, s.name as sow_name FROM litters l JOIN sows s ON l.sow_id = s.id WHERE l.id = ?', [litterId], (err, litterResult) => {
        if (err) return res.status(500).json({ error: err.message });
        if (litterResult.length === 0) return res.status(404).json({ error: 'Litter not found' });
        
        const litter = litterResult[0];
        
        db.query('SELECT * FROM litter_mortality WHERE litter_id = ? ORDER BY death_date DESC', [litterId], (err, mortality) => {
            db.query('SELECT * FROM litter_weights WHERE litter_id = ? ORDER BY weight_date', [litterId], (err, weights) => {
                db.query('SELECT * FROM litter_health WHERE litter_id = ? ORDER BY record_date DESC', [litterId], (err, health) => {
                    db.query('SELECT * FROM cross_fostering WHERE litter_id = ? OR from_litter_id = ? OR to_litter_id = ? ORDER BY fostering_date DESC', [litterId, litterId, litterId], (err, fostering) => {
                        db.query('SELECT * FROM litter_timeline WHERE litter_id = ? ORDER BY event_date DESC', [litterId], (err, timeline) => {
                            db.query('SELECT * FROM litter_alerts WHERE litter_id = ? AND is_resolved = FALSE', [litterId], (err, alerts) => {
                                const current_alive = litter.born_alive - (mortality.reduce((sum, m) => sum + m.number_died, 0));
                                res.json({
                                    ...litter,
                                    current_alive,
                                    mortality,
                                    weights,
                                    health,
                                    fostering,
                                    timeline,
                                    alerts
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Add new litter
app.post('/api/litters', (req, res) => {
    const { sow_id, farrowing_date, total_born, born_alive, stillborn, mummified, birth_weight, parity_number, notes } = req.body;
    
    if (!sow_id || !farrowing_date || !total_born || !born_alive) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(
            `INSERT INTO litters (sow_id, farrowing_date, total_born, born_alive, stillborn, mummified, notes, parity_number) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [sow_id, farrowing_date, total_born, born_alive, stillborn || 0, mummified || 0, notes, parity_number || 1],
            (err, result) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }
                
                const litterId = result.insertId;
                
                if (birth_weight) {
                    db.query(
                        'INSERT INTO litter_weights (litter_id, weight_date, weight_kg, weight_type) VALUES (?, ?, ?, "birth")',
                        [litterId, farrowing_date, birth_weight],
                        (err) => { if (err) console.error(err); }
                    );
                }
                
                db.query(
                    'INSERT INTO litter_timeline (litter_id, event_date, event_type, event_title, event_description) VALUES (?, ?, "birth", "Litter Born", ?)',
                    [litterId, farrowing_date + ' 08:00:00', `${total_born} piglets born, ${born_alive} alive`]
                );
                
                db.query('UPDATE sows SET status = ?, reproductive_status = "lactating" WHERE id = ?', ['lactating', sow_id]);
                
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }
                    res.json({ id: litterId, message: 'Litter recorded' });
                });
            }
        );
    });
});

// Record mortality
app.post('/api/litters/:id/mortality', (req, res) => {
    const litterId = req.params.id;
    const { death_date, number_died, cause, notes } = req.body;
    
    if (!death_date || !number_died || !cause) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(
            'INSERT INTO litter_mortality (litter_id, death_date, number_died, cause, notes) VALUES (?, ?, ?, ?, ?)',
            [litterId, death_date, number_died, cause, notes],
            (err, result) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }
                
                db.query('SELECT born_alive FROM litters WHERE id = ?', [litterId], (err, litter) => {
                    if (err || litter.length === 0) {
                        return db.rollback(() => res.status(500).json({ error: 'Litter not found' }));
                    }
                    const bornAlive = litter[0].born_alive;
                    
                    db.query('SELECT SUM(number_died) as total FROM litter_mortality WHERE litter_id = ?', [litterId], (err, deathSum) => {
                        const totalDeaths = deathSum[0]?.total || 0;
                        const survivalRate = ((bornAlive - totalDeaths) / bornAlive * 100).toFixed(1);
                        
                        db.query(
                            'INSERT INTO litter_timeline (litter_id, event_date, event_type, event_title, event_description) VALUES (?, ?, "death", "Mortality Recorded", ?)',
                            [litterId, death_date + ' 00:00:00', `${number_died} piglet(s) died - Cause: ${cause}`]
                        );
                        
                        if (survivalRate < 85) {
                            db.query(
                                'INSERT INTO litter_alerts (litter_id, alert_type, alert_message, alert_level) VALUES (?, "high_mortality", ?, ?)',
                                [litterId, `Mortality rate is ${(100 - survivalRate).toFixed(1)}%`, survivalRate < 70 ? 'danger' : 'warning']
                            );
                        }
                        
                        db.commit(err => {
                            if (err) {
                                return db.rollback(() => res.status(500).json({ error: err.message }));
                            }
                            res.json({ id: result.insertId, message: 'Mortality recorded', survival_rate: parseFloat(survivalRate) });
                        });
                    });
                });
            }
        );
    });
});

// Record weight
app.post('/api/litters/:id/weight', (req, res) => {
    const litterId = req.params.id;
    const { weight_date, weight_kg, weight_type, notes } = req.body;
    
    if (!weight_date || !weight_kg || !weight_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.query(
        'INSERT INTO litter_weights (litter_id, weight_date, weight_kg, weight_type, notes) VALUES (?, ?, ?, ?, ?)',
        [litterId, weight_date, weight_kg, weight_type, notes],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (weight_type === 'current') {
                db.query('UPDATE litters SET current_weight_avg = ? WHERE id = ?', [weight_kg, litterId]);
            } else if (weight_type === 'weaning') {
                db.query('UPDATE litters SET weaning_weight_avg = ? WHERE id = ?', [weight_kg, litterId]);
            }
            
            db.query(
                'INSERT INTO litter_timeline (litter_id, event_date, event_type, event_title, event_description) VALUES (?, ?, "weight", "Weight Recorded", ?)',
                [litterId, weight_date + ' 00:00:00', `Average weight: ${weight_kg}kg (${weight_type})`]
            );
            
            res.json({ id: result.insertId, message: 'Weight recorded' });
        }
    );
});

// Record health/treatment
app.post('/api/litters/:id/health', (req, res) => {
    const litterId = req.params.id;
    const { record_date, record_type, diagnosis, medication, dosage, administered_by, notes } = req.body;
    
    if (!record_date || !record_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.query(
        'INSERT INTO litter_health (litter_id, record_date, record_type, diagnosis, medication, dosage, administered_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [litterId, record_date, record_type, diagnosis, medication, dosage, administered_by, notes],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.query(
                'INSERT INTO litter_timeline (litter_id, event_date, event_type, event_title, event_description) VALUES (?, ?, ?, ?, ?)',
                [litterId, record_date + ' 00:00:00', record_type === 'vaccination' ? 'vaccination' : 'treatment', 
                 `${record_type} Recorded`, diagnosis || medication || 'Health record added']
            );
            
            res.json({ id: result.insertId, message: 'Health record added' });
        }
    );
});

// Record cross fostering
app.post('/api/litters/:id/fostering', (req, res) => {
    const litterId = req.params.id;
    const { fostering_date, piglets_count, fostering_type, target_litter, reason, notes } = req.body;
    
    if (!fostering_date || !piglets_count || !fostering_type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(
            'INSERT INTO cross_fostering (litter_id, from_litter_id, to_litter_id, piglets_count, fostering_date, reason, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [litterId, fostering_type === 'add' ? target_litter : litterId, fostering_type === 'remove' ? target_litter : litterId, piglets_count, fostering_date, reason, notes],
            (err, result) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }
                
                const action = fostering_type === 'add' ? 'Added to' : 'Removed from';
                db.query(
                    'INSERT INTO litter_timeline (litter_id, event_date, event_type, event_title, event_description) VALUES (?, ?, "fostering", "Cross Fostering", ?)',
                    [litterId, fostering_date + ' 00:00:00', `${piglets_count} piglets ${action} litter`]
                );
                
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }
                    res.json({ id: result.insertId, message: 'Cross fostering recorded' });
                });
            }
        );
    });
});

// Mark litter as weaned
app.put('/api/litters/:id/wean', (req, res) => {
    const litterId = req.params.id;
    const { weaning_date, number_weaned, weaning_weight } = req.body;
    
    if (!weaning_date || !number_weaned) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query('UPDATE litters SET weaning_date = ?, number_weaned = ? WHERE id = ?', [weaning_date, number_weaned, litterId], (err) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ error: err.message }));
            }
            
            if (weaning_weight) {
                db.query('INSERT INTO litter_weights (litter_id, weight_date, weight_kg, weight_type) VALUES (?, ?, ?, "weaning")', [litterId, weaning_date, weaning_weight]);
            }
            
            db.query('SELECT sow_id FROM litters WHERE id = ?', [litterId], (err, litter) => {
                if (litter && litter.length > 0) {
                    db.query('UPDATE sows SET status = ?, reproductive_status = "active" WHERE id = ?', ['active', litter[0].sow_id]);
                }
            });
            
            db.query('INSERT INTO litter_timeline (litter_id, event_date, event_type, event_title, event_description) VALUES (?, ?, "weaning", "Litter Weaned", ?)', [litterId, weaning_date + ' 00:00:00', `${number_weaned} piglets weaned`]);
            db.query('UPDATE litter_alerts SET is_resolved = TRUE, resolved_at = NOW() WHERE litter_id = ?', [litterId]);
            
            db.commit(err => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }
                res.json({ message: 'Litter weaned' });
            });
        });
    });
});

// Get litter statistics
app.get('/api/litters/stats', (req, res) => {
    const queries = {
        total: 'SELECT COUNT(*) as total FROM litters',
        active: 'SELECT COUNT(*) as active FROM litters WHERE weaning_date IS NULL',
        weaned: 'SELECT COUNT(*) as weaned FROM litters WHERE weaning_date IS NOT NULL',
        totalPiglets: 'SELECT SUM(total_born) as total FROM litters',
        avgLitterSize: 'SELECT AVG(total_born) as avg FROM litters',
        mortality: 'SELECT SUM(number_died) as total FROM litter_mortality',
        survival: `
            SELECT AVG((born_alive - IFNULL((SELECT SUM(number_died) FROM litter_mortality WHERE litter_id = l.id), 0)) / born_alive * 100) as avg_survival
            FROM litters l WHERE born_alive > 0
        `
    };
    
    db.query(queries.total, (err, total) => {
        db.query(queries.active, (err, active) => {
            db.query(queries.weaned, (err, weaned) => {
                db.query(queries.totalPiglets, (err, totalPiglets) => {
                    db.query(queries.avgLitterSize, (err, avgSize) => {
                        db.query(queries.mortality, (err, mortality) => {
                            db.query(queries.survival, (err, survival) => {
                                res.json({
                                    totalLitters: total[0]?.total || 0,
                                    activeLitters: active[0]?.active || 0,
                                    weanedLitters: weaned[0]?.weaned || 0,
                                    totalPiglets: totalPiglets[0]?.total || 0,
                                    avgLitterSize: parseFloat(avgSize[0]?.avg || 0).toFixed(1),
                                    totalMortality: mortality[0]?.total || 0,
                                    avgSurvivalRate: parseFloat(survival[0]?.avg_survival || 0).toFixed(1)
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Get litter timeline
app.get('/api/litters/:id/timeline', (req, res) => {
    db.query('SELECT * FROM litter_timeline WHERE litter_id = ? ORDER BY event_date DESC', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get litter alerts
app.get('/api/litters/:id/alerts', (req, res) => {
    db.query('SELECT * FROM litter_alerts WHERE litter_id = ? AND is_resolved = FALSE', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Resolve litter alert
app.put('/api/litters/alerts/:id/resolve', (req, res) => {
    db.query('UPDATE litter_alerts SET is_resolved = TRUE, resolved_at = NOW() WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Alert resolved' });
    });
});

// Delete litter (admin only)
app.delete('/api/litters/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    db.query('DELETE FROM litters WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Litter deleted' });
    });
});

// ============= FEED ROUTES (ENHANCED) =============
// Get all feed inventory with stock status
app.get('/api/feed', (req, res) => {
    db.query(`
        SELECT f.*,
               CASE 
                   WHEN f.quantity_kg <= f.min_stock_level THEN 'low'
                   WHEN f.quantity_kg <= f.min_stock_level * 1.5 THEN 'warning'
                   ELSE 'good'
               END as stock_status,
               f.quantity_kg * f.cost_per_kg as total_value,
               (SELECT SUM(quantity_kg) FROM feed_allocations WHERE feed_id = f.id AND YEARWEEK(allocation_date) = YEARWEEK(CURDATE())) as weekly_usage
        FROM feed_inventory f
        ORDER BY 
            CASE 
                WHEN f.quantity_kg <= f.min_stock_level THEN 1
                WHEN f.quantity_kg <= f.min_stock_level * 1.5 THEN 2
                ELSE 3
            END,
            f.feed_type
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add new feed
app.post('/api/feed', (req, res) => {
    const { feed_type, feed_type_category, quantity_kg, cost_per_kg, purchase_date, supplier, min_stock_level, reorder_quantity } = req.body;
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(
            `INSERT INTO feed_inventory (feed_type, feed_type_category, quantity_kg, cost_per_kg, purchase_date, supplier, min_stock_level, reorder_quantity, last_restocked) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
            [feed_type, feed_type_category || 'grower', quantity_kg, cost_per_kg, purchase_date, supplier, min_stock_level || 100, reorder_quantity || 200],
            (err, result) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }
                
                const feedId = result.insertId;
                
                db.query(
                    'INSERT INTO feed_purchases (feed_id, purchase_date, quantity_kg, cost_per_kg, supplier) VALUES (?, CURDATE(), ?, ?, ?)',
                    [feedId, quantity_kg, cost_per_kg, supplier]
                );
                
                db.query(
                    'INSERT INTO feed_timeline (event_date, event_type, feed_id, quantity_kg, description) VALUES (NOW(), "purchase", ?, ?, ?)',
                    [feedId, quantity_kg, `New feed added: ${feed_type}`]
                );
                
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }
                    res.json({ id: feedId, message: 'Feed added' });
                });
            }
        );
    });
});

// Restock feed
app.post('/api/feed/:id/restock', (req, res) => {
    const feedId = req.params.id;
    const { quantity_kg, cost_per_kg, supplier } = req.body;
    
    db.beginTransaction(err => {
        // ❗️ FIXED: removed extra closing parenthesis
        if (err) return res.status(500).json({ error: err.message });
        
        db.query(
            'UPDATE feed_inventory SET quantity_kg = quantity_kg + ?, cost_per_kg = ?, last_restocked = CURDATE() WHERE id = ?',
            [quantity_kg, cost_per_kg || null, feedId],
            (err) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }
                
                db.query(
                    'INSERT INTO feed_purchases (feed_id, purchase_date, quantity_kg, cost_per_kg, supplier) VALUES (?, CURDATE(), ?, ?, ?)',
                    [feedId, quantity_kg, cost_per_kg, supplier]
                );
                
                db.query(
                    'INSERT INTO feed_timeline (event_date, event_type, feed_id, quantity_kg, description) VALUES (NOW(), "restock", ?, ?, ?)',
                    [feedId, quantity_kg, `Restocked: ${quantity_kg}kg`]
                );
                
                db.commit(err => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }
                    res.json({ message: 'Feed restocked' });
                });
            }
        );
    });
});

// Record feed allocation (feeding)
app.post('/api/feed/allocate', (req, res) => {
    const { feed_id, allocation_date, quantity_kg, feeding_time, allocated_to_type, allocated_to_id, allocated_to_name, notes } = req.body;
    
    db.beginTransaction(err => {
        // ❗️ FIXED: removed extra closing parenthesis
        if (err) return res.status(500).json({ error: err.message });
        
        db.query('SELECT quantity_kg, cost_per_kg, feed_type FROM feed_inventory WHERE id = ?', [feed_id], (err, feed) => {
            if (err || feed.length === 0) {
                return db.rollback(() => res.status(404).json({ error: 'Feed not found' }));
            }
            
            if (feed[0].quantity_kg < quantity_kg) {
                return db.rollback(() => res.status(400).json({ error: 'Insufficient stock' }));
            }
            
            const costAtTime = quantity_kg * feed[0].cost_per_kg;
            
            db.query(
                'INSERT INTO feed_allocations (feed_id, allocation_date, quantity_kg, feeding_time, allocated_to_type, allocated_to_id, allocated_to_name, cost_at_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [feed_id, allocation_date, quantity_kg, feeding_time, allocated_to_type, allocated_to_id || null, allocated_to_name, costAtTime, notes],
                (err, result) => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }
                    
                    db.query('UPDATE feed_inventory SET quantity_kg = quantity_kg - ? WHERE id = ?', [quantity_kg, feed_id], (err) => {
                        if (err) {
                            return db.rollback(() => res.status(500).json({ error: err.message }));
                        }
                        
                        db.query('SELECT quantity_kg, min_stock_level FROM feed_inventory WHERE id = ?', [feed_id], (err, updatedFeed) => {
                            if (updatedFeed && updatedFeed.length > 0 && updatedFeed[0].quantity_kg <= updatedFeed[0].min_stock_level) {
                                db.query(
                                    'INSERT INTO feed_alerts (feed_id, alert_type, alert_message) VALUES (?, "low_stock", ?)',
                                    [feed_id, `Low stock: ${updatedFeed[0].quantity_kg}kg remaining`]
                                );
                            }
                        });
                        
                        db.query(
                            'INSERT INTO feed_timeline (event_date, event_type, feed_id, quantity_kg, description) VALUES (NOW(), "allocation", ?, ?, ?)',
                            [feed_id, quantity_kg, `${quantity_kg}kg allocated to ${allocated_to_name || allocated_to_type}`]
                        );
                        
                        db.commit(err => {
                            if (err) {
                                return db.rollback(() => res.status(500).json({ error: err.message }));
                            }
                            res.json({ id: result.insertId, message: 'Feeding recorded', cost: costAtTime });
                        });
                    });
                }
            );
        });
    });
});

// Get feed consumption records
app.get('/api/feed/consumption', (req, res) => {
    const { period, feed_id, allocated_to_type } = req.query;
    
    let dateFilter = '';
    if (period === 'today') dateFilter = 'AND DATE(allocation_date) = CURDATE()';
    else if (period === 'week') dateFilter = 'AND YEARWEEK(allocation_date) = YEARWEEK(CURDATE())';
    else if (period === 'month') dateFilter = 'AND MONTH(allocation_date) = MONTH(CURDATE()) AND YEAR(allocation_date) = YEAR(CURDATE())';
    
    let query = `
        SELECT f.feed_type, f.feed_type_category, a.*
        FROM feed_allocations a
        JOIN feed_inventory f ON a.feed_id = f.id
        WHERE 1=1 ${dateFilter}
    `;
    const params = [];
    if (feed_id) {
        query += ' AND a.feed_id = ?';
        params.push(feed_id);
    }
    if (allocated_to_type) {
        query += ' AND a.allocated_to_type = ?';
        params.push(allocated_to_type);
    }
    query += ' ORDER BY a.allocation_date DESC LIMIT 50';
    
    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get feed overview stats
app.get('/api/feed/overview', (req, res) => {
    const queries = {
        totalStock: 'SELECT SUM(quantity_kg) as total FROM feed_inventory',
        totalValue: 'SELECT SUM(quantity_kg * cost_per_kg) as total_value FROM feed_inventory',
        usedToday: 'SELECT SUM(quantity_kg) as total FROM feed_allocations WHERE DATE(allocation_date) = CURDATE()',
        usedThisWeek: 'SELECT SUM(quantity_kg) as total FROM feed_allocations WHERE YEARWEEK(allocation_date) = YEARWEEK(CURDATE())',
        lowStockCount: 'SELECT COUNT(*) as count FROM feed_inventory WHERE quantity_kg <= min_stock_level',
        monthlyCost: 'SELECT SUM(cost_at_time) as total FROM feed_allocations WHERE MONTH(allocation_date) = MONTH(CURDATE()) AND YEAR(allocation_date) = YEAR(CURDATE())'
    };
    
    db.query(queries.totalStock, (err, stock) => {
        db.query(queries.totalValue, (err, value) => {
            db.query(queries.usedToday, (err, today) => {
                db.query(queries.usedThisWeek, (err, week) => {
                    db.query(queries.lowStockCount, (err, low) => {
                        db.query(queries.monthlyCost, (err, cost) => {
                            res.json({
                                totalStock: stock[0]?.total || 0,
                                totalValue: value[0]?.total_value || 0,
                                usedToday: today[0]?.total || 0,
                                usedThisWeek: week[0]?.total || 0,
                                lowStockCount: low[0]?.count || 0,
                                monthlyCost: cost[0]?.total || 0
                            });
                        });
                    });
                });
            });
        });
    });
});

// Get feed usage trends
app.get('/api/feed/trends', (req, res) => {
    db.query(`
        SELECT DATE(allocation_date) as date, SUM(quantity_kg) as daily_total, SUM(cost_at_time) as daily_cost
        FROM feed_allocations
        WHERE allocation_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(allocation_date)
        ORDER BY date DESC
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get feed alerts
app.get('/api/feed/alerts', (req, res) => {
    db.query(`
        SELECT a.*, f.feed_type, f.quantity_kg, f.min_stock_level, f.reorder_quantity
        FROM feed_alerts a
        JOIN feed_inventory f ON a.feed_id = f.id
        WHERE a.is_resolved = FALSE
        ORDER BY a.created_at DESC
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Resolve feed alert
app.put('/api/feed/alerts/:id/resolve', (req, res) => {
    db.query('UPDATE feed_alerts SET is_resolved = TRUE, resolved_at = NOW() WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Alert resolved' });
    });
});

// Get feed timeline
app.get('/api/feed/timeline', (req, res) => {
    db.query(`
        SELECT t.*, f.feed_type
        FROM feed_timeline t
        LEFT JOIN feed_inventory f ON t.feed_id = f.id
        ORDER BY t.event_date DESC
        LIMIT 50
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Calculate Feed Conversion Ratio (FCR) for a litter
app.get('/api/feed/fcr/:litterId', (req, res) => {
    const litterId = req.params.litterId;
    
    db.query(`
        SELECT 
            l.id, l.litter_id,
            SUM(fa.quantity_kg) as total_feed,
            (l.weaning_weight_avg - l.birth_weight_avg) as total_gain,
            SUM(fa.quantity_kg) / NULLIF((l.weaning_weight_avg - l.birth_weight_avg), 0) as fcr,
            SUM(fa.cost_at_time) / NULLIF((l.weaning_weight_avg - l.birth_weight_avg), 0) as cost_per_kg_gain
        FROM litters l
        LEFT JOIN feed_allocations fa ON fa.allocated_to_id = l.id AND fa.allocated_to_type = 'litter'
        WHERE l.id = ?
        GROUP BY l.id
    `, [litterId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || {});
    });
});

// ============= FINANCE ROUTES (ENHANCED) =============
// Get all income
app.get('/api/income', (req, res) => {
    db.query('SELECT * FROM income ORDER BY income_date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add income
app.post('/api/income', (req, res) => {
    const { source, amount, income_date, description, quantity, price_per_unit, customer, payment_method, status } = req.body;
    
    db.query(
        'INSERT INTO income (source, amount, income_date, description, quantity, price_per_unit, customer, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [source, amount, income_date, description, quantity, price_per_unit, customer, payment_method, status || 'paid'],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, message: 'Income added' });
        }
    );
});

// Get all expenses
app.get('/api/expenses', (req, res) => {
    db.query('SELECT * FROM expenses ORDER BY expense_date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add expense
app.post('/api/expenses', (req, res) => {
    const { category, amount, expense_date, description, payment_method, supplier, invoice_number, notes } = req.body;
    
    db.query(
        'INSERT INTO expenses (category, amount, expense_date, description, payment_method, supplier, invoice_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [category, amount, expense_date, description, payment_method, supplier, invoice_number, notes],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, message: 'Expense added' });
        }
    );
});

// Get financial summary
app.get('/api/finance/summary', (req, res) => {
    const { period } = req.query; // week, month, year
    
    let dateFilter = '';
    if (period === 'week') {
        dateFilter = 'AND DATE(income_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
        dateFilter = 'AND MONTH(income_date) = MONTH(CURDATE()) AND YEAR(income_date) = YEAR(CURDATE())';
    } else if (period === 'year') {
        dateFilter = 'AND YEAR(income_date) = YEAR(CURDATE())';
    }
    
    db.query(`SELECT SUM(amount) as total FROM income WHERE 1=1 ${dateFilter}`, (err, incomeRes) => {
        db.query(`SELECT SUM(amount) as total FROM expenses WHERE 1=1 ${dateFilter.replace('income_date', 'expense_date')}`, (err, expenseRes) => {
            const totalIncome = incomeRes[0]?.total || 0;
            const totalExpenses = expenseRes[0]?.total || 0;
            
            res.json({
                totalIncome,
                totalExpenses,
                profit: totalIncome - totalExpenses,
                profitMargin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0
            });
        });
    });
});

// Get monthly finance data (for charts)
app.get('/api/finance/monthly', (req, res) => {
    db.query(`
        SELECT 
            DATE_FORMAT(income_date, '%Y-%m') as month,
            SUM(amount) as income,
            0 as expense
        FROM income
        GROUP BY month
        UNION ALL
        SELECT 
            DATE_FORMAT(expense_date, '%Y-%m') as month,
            0 as income,
            SUM(amount) as expense
        FROM expenses
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Combine income and expense per month
        const monthlyMap = new Map();
        results.forEach(row => {
            if (!monthlyMap.has(row.month)) {
                monthlyMap.set(row.month, { month: row.month, income: 0, expense: 0 });
            }
            const entry = monthlyMap.get(row.month);
            entry.income += row.income;
            entry.expense += row.expense;
        });
        
        const monthly = Array.from(monthlyMap.values()).map(m => ({
            ...m,
            profit: m.income - m.expense
        }));
        
        res.json(monthly);
    });
});

// ============= HEALTH ROUTES (ENHANCED) =============
// Get all health records
app.get('/api/health', (req, res) => {
    db.query(`
        SELECT h.*, 
               CASE 
                   WHEN h.animal_type = 'sow' THEN (SELECT tag_number FROM sows WHERE id = h.animal_id)
                   WHEN h.animal_type = 'piglet' THEN (SELECT CONCAT('Piglet ', h.animal_id))
                   ELSE NULL 
               END as animal_tag
        FROM health_records h
        ORDER BY h.date_administered DESC
        LIMIT 100
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add health record
app.post('/api/health', (req, res) => {
    const { animal_id, animal_type, record_type, date_administered, next_due_date, diagnosis, medication, dosage, administered_by, cost, notes } = req.body;
    
    db.query(
        'INSERT INTO health_records (animal_id, animal_type, record_type, date_administered, next_due_date, diagnosis, medication, dosage, administered_by, cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [animal_id, animal_type, record_type, date_administered, next_due_date, diagnosis, medication, dosage, administered_by, cost, notes],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, message: 'Health record added' });
        }
    );
});

// Get upcoming vaccinations
app.get('/api/health/upcoming', (req, res) => {
    db.query(`
        SELECT h.*, 
               CASE 
                   WHEN h.animal_type = 'sow' THEN (SELECT tag_number FROM sows WHERE id = h.animal_id)
                   ELSE NULL 
               END as animal_tag,
               DATEDIFF(h.next_due_date, CURDATE()) as days_until_due
        FROM health_records h
        WHERE h.next_due_date IS NOT NULL 
          AND h.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY h.next_due_date
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get vaccination schedule
app.get('/api/health/schedule', (req, res) => {
    db.query('SELECT * FROM vaccination_schedule ORDER BY animal_type, age_days', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Update health record
app.put('/api/health/:id', (req, res) => {
    const { next_due_date, notes } = req.body;
    db.query('UPDATE health_records SET next_due_date = ?, notes = ? WHERE id = ?', [next_due_date, notes, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Health record updated' });
    });
});

// Delete health record
app.delete('/api/health/:id', (req, res) => {
    db.query('DELETE FROM health_records WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Health record deleted' });
    });
});

// Quarantine routes
app.get('/api/quarantine', (req, res) => {
    db.query('SELECT * FROM quarantine WHERE status = "active" ORDER BY start_date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/quarantine', (req, res) => {
    const { animal_id, animal_type, reason, start_date, location, notes } = req.body;
    db.query(
        'INSERT INTO quarantine (animal_id, animal_type, reason, start_date, location, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [animal_id, animal_type, reason, start_date, location, notes],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, message: 'Added to quarantine' });
        }
    );
});

app.put('/api/quarantine/:id/release', (req, res) => {
    const { end_date } = req.body;
    db.query('UPDATE quarantine SET status = "released", end_date = ? WHERE id = ?', [end_date || new Date().toISOString().split('T')[0], req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Released from quarantine' });
    });
});

// ============= MESSAGES/INBOX ROUTES =============
app.get('/api/messages', authenticateToken, (req, res) => {
    db.query(`
        SELECT m.*, 
               sender.name as sender_name, sender.role as sender_role,
               receiver.name as receiver_name
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        WHERE m.receiver_id = ? OR m.sender_id = ?
        ORDER BY m.created_at DESC
    `, [req.user.id, req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/messages', authenticateToken, (req, res) => {
    const { receiver_id, subject, message, attachments } = req.body;
    
    db.query(
        'INSERT INTO messages (sender_id, receiver_id, subject, message, attachments) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, receiver_id, subject, message, JSON.stringify(attachments)],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, message: 'Message sent' });
        }
    );
});

app.put('/api/messages/:id/read', authenticateToken, (req, res) => {
    db.query(
        'UPDATE messages SET is_read = TRUE WHERE id = ? AND receiver_id = ?',
        [req.params.id, req.user.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Message marked as read' });
        }
    );
});

// ============= BREEDS ROUTES =============
app.get('/api/breeds', (req, res) => {
    db.query('SELECT * FROM breeds ORDER BY name', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ============= DASHBOARD ROUTES =============
app.get('/api/dashboard', (req, res) => {
    const queries = {
        sows: 'SELECT COUNT(*) as count FROM sows WHERE status IN ("active", "pregnant", "heat", "lactating")',
        litters: 'SELECT COUNT(*) as count FROM litters',
        piglets: 'SELECT SUM(born_alive) as total FROM litters',
        feed: 'SELECT SUM(quantity_kg) as total_feed, SUM(quantity_kg * cost_per_kg) as feed_value FROM feed_inventory',
        recent: 'SELECT l.*, s.tag_number FROM litters l JOIN sows s ON l.sow_id = s.id ORDER BY farrowing_date DESC LIMIT 5',
        income: 'SELECT SUM(amount) as total FROM income WHERE MONTH(income_date) = MONTH(CURDATE()) AND YEAR(income_date) = YEAR(CURDATE())',
        expense: 'SELECT SUM(amount) as total FROM expenses WHERE MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE())'
    };
    
    db.query(queries.sows, (err, sows) => {
        db.query(queries.litters, (err, litters) => {
            db.query(queries.piglets, (err, piglets) => {
                db.query(queries.feed, (err, feed) => {
                    db.query(queries.recent, (err, recent) => {
                        db.query(queries.income, (err, income) => {
                            db.query(queries.expense, (err, expense) => {
                                res.json({
                                    activeSows: sows[0]?.count || 0,
                                    totalLitters: litters[0]?.count || 0,
                                    totalPiglets: piglets[0]?.total || 0,
                                    totalFeed: feed[0]?.total_feed || 0,
                                    feedValue: feed[0]?.feed_value || 0,
                                    recentLitters: recent || [],
                                    monthlyIncome: income[0]?.total || 0,
                                    monthlyExpense: expense[0]?.total || 0,
                                    monthlyProfit: (income[0]?.total || 0) - (expense[0]?.total || 0)
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// ============= PIGS STAGES ROUTE (SAMPLE) =============
app.get('/api/pigs/stages', (req, res) => {
    const stages = [
        { name: 'Piglet', value: 12 },
        { name: 'Weaner', value: 8 },
        { name: 'Grower', value: 5 },
        { name: 'Finisher', value: 3 },
        { name: 'Sow', value: 4 }
    ];
    res.json(stages);
});

// ============= REPORTS ROUTES =============
// Overview stats for reports
app.get('/api/reports/overview', (req, res) => {
    const queries = {
        totalPigs: 'SELECT COUNT(*) as total FROM sows WHERE status IN ("active", "pregnant", "lactating")',
        totalLitters: 'SELECT COUNT(*) as total FROM litters',
        avgLitterSize: 'SELECT AVG(total_born) as avg FROM litters',
        mortalityRate: `
            SELECT AVG((born_alive - IFNULL((SELECT SUM(number_died) FROM litter_mortality WHERE litter_id = l.id), 0)) / born_alive * 100) as survival,
                   AVG(IFNULL((SELECT SUM(number_died) FROM litter_mortality WHERE litter_id = l.id), 0) / born_alive * 100) as mortality
            FROM litters l
            WHERE born_alive > 0
        `,
        feedConsumption: 'SELECT SUM(quantity_kg) as total FROM feed_allocations WHERE YEARWEEK(allocation_date) = YEARWEEK(CURDATE())',
        totalIncome: 'SELECT SUM(amount) as total FROM income WHERE MONTH(income_date) = MONTH(CURDATE()) AND YEAR(income_date) = YEAR(CURDATE())',
        totalExpenses: 'SELECT SUM(amount) as total FROM expenses WHERE MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE())'
    };
    
    db.query(queries.totalPigs, (err, pigs) => {
        db.query(queries.totalLitters, (err, litters) => {
            db.query(queries.avgLitterSize, (err, avg) => {
                db.query(queries.mortalityRate, (err, mortality) => {
                    db.query(queries.feedConsumption, (err, feed) => {
                        db.query(queries.totalIncome, (err, income) => {
                            db.query(queries.totalExpenses, (err, expenses) => {
                                const totalIncome = income[0]?.total || 0;
                                const totalExpenses = expenses[0]?.total || 0;
                                res.json({
                                    totalPigs: pigs[0]?.total || 0,
                                    totalLitters: litters[0]?.total || 0,
                                    avgLitterSize: parseFloat(avg[0]?.avg || 0).toFixed(1),
                                    mortalityRate: parseFloat(mortality[0]?.mortality || 0).toFixed(1),
                                    feedConsumption: feed[0]?.total || 0,
                                    totalIncome,
                                    totalExpenses,
                                    netProfit: totalIncome - totalExpenses
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Production report (best sow/litter)
app.get('/api/reports/production', (req, res) => {
    db.query(`
        SELECT s.id, s.tag_number, s.name, COUNT(l.id) as litter_count, SUM(l.total_born) as total_born, SUM(l.born_alive) as total_alive
        FROM sows s
        LEFT JOIN litters l ON s.id = l.sow_id
        GROUP BY s.id
        ORDER BY total_alive DESC
        LIMIT 1
    `, (err, bestSow) => {
        db.query(`
            SELECT l.id, l.litter_id, s.tag_number as sow_tag, l.total_born, l.born_alive, 
                   (SELECT COUNT(*) FROM litter_mortality WHERE litter_id = l.id) as deaths
            FROM litters l
            JOIN sows s ON l.sow_id = s.id
            ORDER BY (l.born_alive - IFNULL((SELECT SUM(number_died) FROM litter_mortality WHERE litter_id = l.id), 0)) DESC
            LIMIT 1
        `, (err, bestLitter) => {
            res.json({
                bestSow: bestSow[0] || null,
                bestLitter: bestLitter[0] || null
            });
        });
    });
});

// ============= START SERVER =============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📝 Test route: http://localhost:${PORT}/api/test`);
    console.log(`📝 Login route: http://localhost:${PORT}/api/login`);
    console.log(`📝 Register route: http://localhost:${PORT}/api/register`);
});