import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

try {
  // Initialize configuration
  dotenv.config();
  console.log('Starting server initialization...');

  const app = express();
  const db = new Database('database.sqlite', { verbose: console.log });
  
  console.log('Database connected');

  // Middleware
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));
  app.use(express.json());
  app.use(express.static('public'));

  // Authentication middleware
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  };

  // Initialize database tables
  console.log('Creating database tables...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      quantity INTEGER NOT NULL,
      threshold INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS barrel_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      threshold INTEGER DEFAULT 3
    );

    CREATE TABLE IF NOT EXISTS barrels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barrel_type_id INTEGER NOT NULL,
      filled BOOLEAN DEFAULT false,
      FOREIGN KEY (barrel_type_id) REFERENCES barrel_types(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS announcement_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Insert default barrel types if not exists
    INSERT OR IGNORE INTO barrel_types (type, color, threshold) VALUES
      ('Chips', '#000000', 3),    -- Black
      ('Vacuum', '#808080', 3),   -- Gray
      ('Coolant', '#40E0D0', 3),  -- Turquoise
      ('Oil', '#DAA520', 3);      -- Amber Brown
  `);

  // Initialize inventory if empty
  console.log('Initializing inventory...');
  const inventoryCount = db.prepare('SELECT COUNT(*) as count FROM inventory').get();
  if (inventoryCount.count === 0) {
    const insertInventory = db.prepare(
      'INSERT INTO inventory (name, description, quantity, threshold) VALUES (?, ?, ?, ?)'
    );
    
    // Initial inventory items
    const initialInventory = [
      ['Cutting Oil', 'Standard cutting oil for machining', 50, 20],
      ['End Mills 1/4"', '1/4 inch carbide end mills', 30, 10],
      ['Drill Bits Set', 'Standard drill bit set', 15, 5],
      ['Coolant', 'Machine coolant', 100, 25],
      ['Inserts', 'Carbide cutting inserts', 200, 50]
    ];
    
    initialInventory.forEach(([name, description, quantity, threshold]) => {
      insertInventory.run(name, description, quantity, threshold);
    });
    console.log('Inventory initialized');
  }

  // Initialize barrel types if empty
  const typesCount = db.prepare('SELECT COUNT(*) as count FROM barrel_types').get();
  if (typesCount.count === 0) {
    const insertType = db.prepare(
      'INSERT INTO barrel_types (type, color, threshold) VALUES (?, ?, ?)'
    );
    
    const barrelTypes = [
      { type: 'Chips', color: '#000000', threshold: 3 },
      { type: 'Vacuum', color: '#808080', threshold: 3 },
      { type: 'Coolant', color: '#40E0D0', threshold: 3 },
      { type: 'Oil', color: '#DAA520', threshold: 3 }
    ];
    
    barrelTypes.forEach(({ type, color, threshold }) => {
      insertType.run(type, color, threshold);
    });
  }

  // Add logging middleware
  const logRequest = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    next();
  };

  app.use(logRequest);

  // Add error logging middleware
  const errorHandler = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error:`, err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message,
      path: req.path
    });
  };

  // Barrels endpoint with fixed query and logging
  app.get('/api/barrels', authenticateToken, async (req, res) => {
    try {
      console.log('[Barrels] Fetching barrel types...');
      
      const types = db.prepare('SELECT * FROM barrel_types').all();
      console.log('[Barrels] Found types:', types);

      const result = types.map(type => {
        const barrels = db.prepare(`
          SELECT b.* 
          FROM barrels b
          WHERE b.barrel_type_id = ?
        `).all([type.id]);

        return {
          ...type,
          barrels: barrels || []
        };
      });

      res.json(result);
    } catch (error) {
      console.error('[Barrels] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add error handler middleware last
  app.use(errorHandler);

  // Initialize barrels if empty (update this section too)
  const initializeBarrels = async () => {
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM barrels').get().count;
      
      if (count === 0) {
        console.log('[Init] Initializing barrels...');
        
        const types = db.prepare('SELECT * FROM barrel_types').all();
        
        types.forEach(type => {
          const initialCount = type.threshold + 2;
          const shouldBeFilled = type.type === 'Coolant' || type.type === 'Oil';
          
          for (let i = 0; i < initialCount; i++) {
            db.prepare(`
              INSERT INTO barrels (barrel_type_id, filled)
              VALUES (?, ?)
            `).run([type.id, shouldBeFilled]);
          }
        });
        
        console.log('[Init] Barrel initialization complete');
      }
    } catch (error) {
      console.error('[Init] Error initializing barrels:', error);
      throw error;
    }
  };

  // Call initialization
  initializeBarrels();

  // Insert demo data
  console.log('Inserting demo data...');
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)');
  const salt = bcrypt.genSaltSync(10);
  insertUser.run('admin', bcrypt.hashSync('admin123', salt), 'admin');
  insertUser.run('user', bcrypt.hashSync('user123', salt), 'user');

  // Add your routes here
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/auth/login', async (req, res) => {
    console.log('Login request received:', {
      username: req.body.username,
      headers: req.headers
    });
    
    try {
      const { username, password } = req.body;
      console.log('Looking up user in database...');
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      
      console.log('User found:', { username: user?.username, role: user?.role });
      
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      console.log('Password verified, generating token...');
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      console.log('Login successful:', { username: user.username, role: user.role });
      res.json({ token, user: { username: user.username, role: user.role } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
  });

  app.get('/api', (req, res) => {
    res.json({ 
      message: 'API is running',
      endpoints: [
        '/api/auth/login',
        '/api/inventory',
        '/api/barrels',
        '/api/announcements'
      ]
    });
  });

  app.get('/api/inventory', authenticateToken, (req, res) => {
    console.log('GET /api/inventory request received');
    try {
      const inventory = db.prepare('SELECT * FROM inventory').all();
      console.log('Sending inventory items:', inventory.length);
      res.json(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  });

  app.put('/api/inventory/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    console.log('PUT /api/inventory/:id request received', { id, updates });

    try {
      const result = db.prepare(`
        UPDATE inventory 
        SET quantity = COALESCE(?, quantity),
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            threshold = COALESCE(?, threshold)
        WHERE id = ?
        RETURNING *
      `).get(updates.quantity, updates.name, updates.description, updates.threshold, id);

      if (!result) {
        console.log('Item not found:', id);
        return res.status(404).json({ error: 'Item not found' });
      }

      console.log('Item updated:', result);
      res.json(result);
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({ error: 'Failed to update inventory' });
    }
  });

  app.post('/api/barrels/:typeId/count', authenticateToken, async (req, res) => {
    const { typeId } = req.params;
    const { action } = req.body;
    
    try {
      if (action === 'increment') {
        db.prepare(`
          INSERT INTO barrels (barrel_type_id, filled)
          VALUES (?, false)
        `).run(typeId);
      } else if (action === 'decrement') {
        db.prepare(`
          DELETE FROM barrels
          WHERE barrel_type_id = ?
          AND id IN (SELECT id FROM barrels WHERE barrel_type_id = ? LIMIT 1)
        `).run(typeId, typeId);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating barrel count:', error);
      res.status(500).json({ error: 'Failed to update barrel count' });
    }
  });

  app.put('/api/barrels/:typeId/threshold', authenticateToken, async (req, res) => {
    const { typeId } = req.params;
    const { threshold } = req.body;
    
    try {
      db.prepare(`
        UPDATE barrel_types
        SET threshold = ?
        WHERE id = ?
      `).run(threshold, typeId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating threshold:', error);
      res.status(500).json({ error: 'Failed to update threshold' });
    }
  });

  app.post('/api/barrels', authenticateToken, (req, res) => {
    const { typeId } = req.body;
    
    try {
      const result = db.prepare('INSERT INTO barrels (barrel_type_id, filled) VALUES (?, 0)').run(typeId);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error('Error adding barrel:', error);
      res.status(500).json({ error: 'Failed to add barrel' });
    }
  });

  app.put('/api/barrels/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { filled } = req.body;
    
    try {
      db.prepare('UPDATE barrels SET filled = ? WHERE id = ?').run(filled ? 1 : 0, id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating barrel:', error);
      res.status(500).json({ error: 'Failed to update barrel' });
    }
  });

  app.delete('/api/barrels/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    try {
      db.prepare('DELETE FROM barrels WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting barrel:', error);
      res.status(500).json({ error: 'Failed to delete barrel' });
    }
  });

  app.post('/api/inventory', authenticateToken, (req, res) => {
    const { name, description, quantity, threshold } = req.body;
    
    try {
      const result = db.prepare(`
        INSERT INTO inventory (name, description, quantity, threshold)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `).get(name, description, quantity, threshold);

      console.log('New item added:', result);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding inventory item:', error);
      res.status(500).json({ error: 'Failed to add inventory item' });
    }
  });

  app.delete('/api/inventory/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    try {
      const result = db.prepare('DELETE FROM inventory WHERE id = ? RETURNING *').get(id);
      
      if (!result) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      res.status(500).json({ error: 'Failed to delete inventory item' });
    }
  });

  // Get all announcements
  app.get('/api/announcements', authenticateToken, (req, res) => {
    try {
      const announcements = db.prepare(`
        SELECT 
          a.*,
          u.username as author,
          COALESCE(
            (SELECT json_group_array(
              json_object(
                'id', r.id,
                'content', r.content,
                'timestamp', r.timestamp,
                'username', (SELECT username FROM users WHERE id = r.user_id)
              )
            )
            FROM announcement_replies r
            WHERE r.announcement_id = a.id),
            '[]'
          ) as replies
        FROM announcements a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.timestamp DESC
      `).all();

      res.json(announcements.map(announcement => ({
        ...announcement,
        replies: JSON.parse(announcement.replies)
      })));
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  // Add new announcement
  app.post('/api/announcements', authenticateToken, (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id;

    try {
      db.prepare('BEGIN TRANSACTION').run();

      const result = db.prepare(`
        INSERT INTO announcements (title, content, user_id)
        VALUES (?, ?, ?)
        RETURNING *
      `).get(title, content, userId);

      db.prepare('COMMIT').run();
      res.status(201).json(result);
    } catch (error) {
      db.prepare('ROLLBACK').run();
      console.error('Error creating announcement:', error);
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  // Update announcement
  app.put('/api/announcements/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    try {
      const result = db.prepare(`
        UPDATE announcements 
        SET title = COALESCE(?, title),
            content = COALESCE(?, content)
        WHERE id = ? AND user_id = ?
        RETURNING *
      `).get(title, content, id, userId);

      if (!result) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error updating announcement:', error);
      res.status(500).json({ error: 'Failed to update announcement' });
    }
  });

  // Delete announcement
  app.delete('/api/announcements/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      // First check if the user is the author or an admin
      const announcement = db.prepare(`
        SELECT user_id FROM announcements WHERE id = ?
      `).get(id);

      if (!announcement) {
        return res.status(404).json({ error: 'Announcement not found' });
      }

      if (announcement.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to delete this announcement' });
      }

      // Delete all replies first
      db.prepare(`
        DELETE FROM announcement_replies WHERE announcement_id = ?
      `).run(id);

      // Then delete the announcement
      db.prepare(`
        DELETE FROM announcements WHERE id = ?
      `).run(id);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      res.status(500).json({ error: 'Failed to delete announcement' });
    }
  });

  // Add reply to announcement
  app.post('/api/announcements/:id/replies', authenticateToken, (req, res) => {
    const { content } = req.body;
    const userId = req.user.id;
    const announcementId = req.params.id;

    try {
      const result = db.prepare(`
        INSERT INTO announcement_replies (announcement_id, user_id, content)
        VALUES (?, ?, ?)
        RETURNING *
      `).get(announcementId, userId, content);

      res.json(result);
    } catch (error) {
      console.error('Error adding reply:', error);
      res.status(500).json({ error: 'Failed to add reply' });
    }
  });

  // Update barrel count
  app.put('/api/barrels/count/:typeId', authenticateToken, async (req, res) => {
    const { typeId } = req.params;
    const { action } = req.body;
    
    try {
      if (action === 'increment') {
        db.prepare(`
          INSERT INTO barrels (barrel_type_id, filled)
          VALUES (?, false)
        `).run([typeId]);
      } else {
        // Find the last barrel of this type and delete it
        const lastBarrel = db.prepare(`
          SELECT id FROM barrels 
          WHERE barrel_type_id = ? 
          ORDER BY id DESC LIMIT 1
        `).get([typeId]);
        
        if (lastBarrel) {
          db.prepare('DELETE FROM barrels WHERE id = ?').run([lastBarrel.id]);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('[Barrels] Error updating count:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update barrel threshold
  app.put('/api/barrels/threshold/:typeId', authenticateToken, async (req, res) => {
    const { typeId } = req.params;
    const { threshold } = req.body;
    
    try {
      db.prepare(`
        UPDATE barrel_types 
        SET threshold = ? 
        WHERE id = ?
      `).run([threshold, typeId]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('[Barrels] Error updating threshold:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.use((req, res) => {
    console.log('404 Not Found:', req.method, req.url);
    res.status(404).json({ error: 'Not Found' });
  });

  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

} catch (error) {
  console.error('Server initialization failed:', error);
  process.exit(1);
}

