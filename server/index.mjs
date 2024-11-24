import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import { generateSecret } from './scripts/manage-secrets.mjs';
import cron from 'node-cron';
import fs from 'fs/promises';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';
import helmet from 'helmet';

async function initializeUsers(db) {
  console.log('Checking user initialization...');
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    if (userCount.count === 0) {
      // Validate environment variables
      const requiredVars = ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'USER_USERNAME', 'USER_PASSWORD'];
      const missing = requiredVars.filter(varName => !process.env[varName]);
      
      if (missing.length > 0) {
        console.error('Missing required environment variables:', missing.join(', '));
        process.exit(1);
      }

      const salt = bcrypt.genSaltSync(10);
      const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
      
      // Create admin user
      insertUser.run(
        process.env.ADMIN_USERNAME,
        bcrypt.hashSync(process.env.ADMIN_PASSWORD, salt),
        'admin'
      );
      console.log('Admin user created successfully');

      // Create regular user
      insertUser.run(
        process.env.USER_USERNAME,
        bcrypt.hashSync(process.env.USER_PASSWORD, salt),
        'user'
      );
      console.log('Regular user created successfully');

      // Verify users were created
      const createdUsers = db.prepare('SELECT username, role FROM users').all();
      console.log('Created users:', createdUsers);
    } else {
      console.log('Users already initialized');
    }
  } catch (error) {
    console.error('Error initializing users:', error);
    throw error;
  }
}

async function initializeBarrels(db) {
  console.log('[Init] Initializing barrels...');
  
  try {
    // Check if barrels already exist
    const barrelCount = db.prepare('SELECT COUNT(*) as count FROM barrels').get();
    
    if (barrelCount.count === 0) {
      console.log('[Init] Creating initial barrels...');
      
      // Begin transaction
      db.exec('BEGIN TRANSACTION;');
      
      try {
        const types = db.prepare('SELECT * FROM barrel_types').all();
        
        types.forEach(type => {
          // Add exactly 3 barrels for each type
          const stmt = db.prepare(`
            INSERT INTO barrels (barrel_type_id, filled)
            VALUES (?, false)
          `);
          
          for (let i = 0; i < 3; i++) {
            stmt.run(type.id);
          }
        });
        
        db.exec('COMMIT;');
        console.log('[Init] Initial barrels created successfully');
      } catch (error) {
        db.exec('ROLLBACK;');
        throw error;
      }
    } else {
      console.log('[Init] Barrels already exist, count:', barrelCount.count);
    }
  } catch (error) {
    console.error('[Init] Error in barrel initialization:', error);
    throw error;
  }
}

async function initializeServer() {
  try {
    // Initialize configuration
    dotenv.config();
    
    // Generate initial JWT secret if not exists
    if (!process.env.JWT_SECRET) {
      const secret = await generateSecret();
      await fs.appendFile('.env', `\nJWT_SECRET=${secret}`);
      process.env.JWT_SECRET = secret;
    }

    // Schedule secret rotation (weekly)
    cron.schedule('0 0 * * 0', async () => {
      try {
        await updateSecrets();
        console.log('JWT secret rotated successfully');
      } catch (error) {
        console.error('Failed to rotate JWT secret:', error);
      }
    });

    const app = express();
    const db = new Database('database.sqlite', { verbose: console.log });
    
    console.log('Database connected');

    // Middleware

        // Security middleware

            // Update rate limiter configuration
    const loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts
      message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
    });
        app.use(helmet());
        app.use(helmet.contentSecurityPolicy({
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        }));

    const allowedOrigins = [
      'https://hughesdavid79.github.io',
      'https://rpomachineshop.com',
      'http://localhost:5173'
    ];

    app.use(cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn('Blocked by CORS:', origin);
          callback(new Error('Not allowed by CORS'));
        }
      },
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

      // Try current secret first
      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (!err) {
          req.user = user;
          return next();
        }

        // If current secret fails, try previous secret
        if (process.env.JWT_SECRET_PREVIOUS) {
          jwt.verify(token, process.env.JWT_SECRET_PREVIOUS, (err, user) => {
            if (!err) {
              req.user = user;
              return next();
            }
            return res.status(403).json({ error: 'Invalid token' });
          });
        } else {
          return res.status(403).json({ error: 'Invalid token' });
        }
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

    // Initialize barrels after table creation
    await initializeBarrels(db);

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

    // Add these routes before the error handler

    // Update reply
    app.put('/api/announcements/:announcementId/replies/:replyId', authenticateToken, (req, res) => {
      const { content } = req.body;
      const { replyId } = req.params;
      const userId = req.user.id;

      try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Only administrators can edit replies' });
        }

        const result = db.prepare(`
          UPDATE announcement_replies 
          SET content = ? 
          WHERE id = ?
          RETURNING id, content, user_id, timestamp
        `).get(content, replyId);

        if (!result) {
          return res.status(404).json({ error: 'Reply not found' });
        }

        res.json(result);
      } catch (error) {
        console.error('Error updating reply:', error);
        res.status(500).json({ error: 'Failed to update reply' });
      }
    });

    // Delete reply
    app.delete('/api/announcements/:announcementId/replies/:replyId', authenticateToken, (req, res) => {
      const { replyId } = req.params;
      const userId = req.user.id;

      try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Only administrators can delete replies' });
        }

        const reply = db.prepare('SELECT id FROM announcement_replies WHERE id = ?').get(replyId);
        
        if (!reply) {
          return res.status(404).json({ error: 'Reply not found' });
        }

        db.prepare('DELETE FROM announcement_replies WHERE id = ?').run(replyId);
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting reply:', error);
        res.status(500).json({ error: 'Failed to delete reply' });
      }
    });

    // Add error handler middleware last
    app.use(errorHandler);

    // Initialize users before starting the server
    await initializeUsers(db);

    // Add your routes here
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.post('/api/auth/login', loginLimiter, async (req, res) => {
      try {
        const { username, password } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

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
    const validateAnnouncement = [
      body('title').trim().notEmpty().escape(),
      body('content').trim().notEmpty().escape(),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        next();
      }
    ];

    app.post('/api/announcements', authenticateToken, validateAnnouncement, (req, res) => {
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

    app.get('/api/users/verify', authenticateToken, (req, res) => {
      try {
        const users = db.prepare('SELECT username, role FROM users').all();
        res.json({ 
          message: 'Users verified',
          count: users.length,
          roles: users.map(u => ({ username: u.username, role: u.role }))
        });
      } catch (error) {
        console.error('Error verifying users:', error);
        res.status(500).json({ error: 'Failed to verify users' });
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
}

initializeServer();

