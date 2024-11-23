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
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      threshold INTEGER DEFAULT 2,
      decrementOnFill BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS barrels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_id INTEGER NOT NULL,
      filled BOOLEAN DEFAULT 0,
      FOREIGN KEY (type_id) REFERENCES barrel_types(id)
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
      'INSERT INTO barrel_types (type, color, threshold, decrementOnFill) VALUES (?, ?, ?, ?)'
    );
    
    const barrelTypes = [
      { type: 'Chips', color: '#8B4513', threshold: 2, decrementOnFill: 0 },
      { type: 'Vacuum', color: '#4A4A4A', threshold: 1, decrementOnFill: 0 },
      { type: 'Coolant', color: '#4169E1', threshold: 2, decrementOnFill: 1 },
      { type: 'Oil', color: '#8B0000', threshold: 2, decrementOnFill: 1 }
    ];
    
    barrelTypes.forEach(({ type, color, threshold, decrementOnFill }) => {
      insertType.run(type, color, threshold, decrementOnFill);
    });
  }

  // Initialize barrels if empty
  const barrelsCount = db.prepare('SELECT COUNT(*) as count FROM barrels').get();
  if (barrelsCount.count === 0) {
    const insertBarrel = db.prepare('INSERT INTO barrels (type_id) VALUES (?)');
    const types = db.prepare('SELECT id, type FROM barrel_types').all();
    
    types.forEach(type => {
      const count = type.type === 'Vacuum' ? 2 : type.type === 'Coolant' ? 4 : 3;
      for (let i = 0; i < count; i++) {
        insertBarrel.run(type.id);
      }
    });
  }

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

  app.get('/api/barrels', authenticateToken, (req, res) => {
    try {
      const defaultTypes = [
        {
          id: '1',
          type: 'Chips',
          color: '#000000',
          threshold: 2,
          decrementOnFill: false,
        },
        {
          id: '2',
          type: 'Vacuum',
          color: '#8B4513',
          threshold: 1,
          decrementOnFill: false,
        },
        {
          id: '3',
          type: 'Coolant',
          color: '#40E0D0',
          threshold: 2,
          decrementOnFill: true,
        },
        {
          id: '4',
          type: 'Oil',
          color: '#FFA500',
          threshold: 1,
          decrementOnFill: true,
        }
      ];

      // Get existing barrel types or use defaults
      const types = db.prepare(`
        SELECT * FROM barrel_types
      `).all() || defaultTypes;

      // Get barrels for each type
      const result = types.map(type => {
        const barrels = db.prepare(`
          SELECT id, filled 
          FROM barrels 
          WHERE type_id = ?
        `).all(type.id);

        return {
          ...type,
          barrels: barrels.map(b => ({
            id: b.id,
            type: type.type,
            color: type.color,
            filled: Boolean(b.filled)
          }))
        };
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching barrels:', error);
      res.status(500).json({ error: 'Failed to fetch barrels' });
    }
  });

  app.post('/api/barrels', authenticateToken, (req, res) => {
    const { typeId } = req.body;
    
    try {
      const result = db.prepare('INSERT INTO barrels (type_id, filled) VALUES (?, 0)').run(typeId);
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
          json_group_array(
            json_object(
              'id', r.id,
              'content', r.content,
              'timestamp', r.timestamp,
              'username', ru.username
            )
          ) as replies
        FROM announcements a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN replies r ON a.id = r.announcement_id
        LEFT JOIN users ru ON r.user_id = ru.id
        GROUP BY a.id
        ORDER BY a.timestamp DESC
      `).all();

      // Parse the JSON string replies back into arrays
      const processedAnnouncements = announcements.map(ann => ({
        ...ann,
        replies: JSON.parse(ann.replies).filter(r => r.id !== null)
      }));

      res.json(processedAnnouncements);
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
  app.delete('/api/announcements/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      db.prepare('BEGIN TRANSACTION').run();

      // Delete replies first
      db.prepare('DELETE FROM replies WHERE announcement_id = ?').run(id);

      // Then delete the announcement
      const result = db.prepare(`
        DELETE FROM announcements 
        WHERE id = ? AND user_id = ?
        RETURNING *
      `).get(id, userId);

      if (!result) {
        db.prepare('ROLLBACK').run();
        return res.status(404).json({ error: 'Announcement not found' });
      }

      db.prepare('COMMIT').run();
      res.json(result);
    } catch (error) {
      db.prepare('ROLLBACK').run();
      console.error('Error deleting announcement:', error);
      res.status(500).json({ error: 'Failed to delete announcement' });
    }
  });

  // Add reply to announcement
  app.post('/api/announcements/:id/replies', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    try {
      const result = db.prepare(`
        INSERT INTO replies (announcement_id, content, user_id, timestamp)
        VALUES (?, ?, ?, datetime('now'))
        RETURNING *
      `).get(id, content, userId);

      res.status(201).json(result);
    } catch (error) {
      console.error('Error adding reply:', error);
      res.status(500).json({ error: 'Failed to add reply' });
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

