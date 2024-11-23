import { openDB, DBSchema } from 'idb';

interface MachineShopDB extends DBSchema {
  users: {
    key: string;
    value: {
      username: string;
      password: string;
      role: 'admin' | 'user';
    };
  };
  inventory: {
    key: number;
    value: {
      id?: number;
      name: string;
      description: string;
      quantity: number;
      threshold: number;
    };
    indexes: { 'by-name': string };
  };
  barrels: {
    key: number;
    value: {
      id?: number;
      type: string;
      filled: boolean;
    };
    indexes: { 'by-type': string };
  };
  announcements: {
    key: number;
    value: {
      id?: number;
      title: string;
      content: string;
      timestamp: string;
    };
    indexes: { timestamp: string };
  };
  replies: {
    key: number;
    value: {
      id?: number;
      announcementId: number;
      content: string;
      timestamp: string;
    };
    indexes: { announcementId: number };
  };
}

const DB_NAME = 'machine-shop-db';
const DB_VERSION = 1;

let dbPromise: Promise<any> | null = null;

export const initDB = async () => {
  try {
    const db = await openDB<MachineShopDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log('Database upgrade running:', { oldVersion, newVersion });
        
        // Inventory store
        if (!db.objectStoreNames.contains('inventory')) {
          console.log('Creating inventory store');
          const inventoryStore = db.createObjectStore('inventory', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          inventoryStore.createIndex('by-name', 'name');
        }

        // Barrels store
        if (!db.objectStoreNames.contains('barrels')) {
          console.log('Creating barrels store');
          const barrelStore = db.createObjectStore('barrels', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          barrelStore.createIndex('by-type', 'type');
          
          // Add demo barrels
          console.log('Adding demo barrels');
          const barrelTypes = [
            { type: 'Chips', count: 3 },
            { type: 'Vacuum', count: 2 },
            { type: 'Coolant', count: 4 },
            { type: 'Oil', count: 3 }
          ];
          
          barrelTypes.forEach(({ type, count }) => {
            Array(count).fill(null).forEach(() => {
              barrelStore.add({ type, filled: false });
            });
          });
        }
      },
      blocked() {
        console.warn('Database upgrade was blocked');
      },
      blocking() {
        console.warn('Database is blocking an upgrade');
      },
      terminated() {
        console.error('Database connection was terminated');
      },
    });

    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

export const getDB = async () => {
  if (!dbPromise) {
    dbPromise = initDB();
  }
  return dbPromise;
};

// Helper function to ensure database connection
export const withDB = async <T>(
  operation: (db: Awaited<ReturnType<typeof getDB>>) => Promise<T>
): Promise<T> => {
  const db = await getDB();
  try {
    return await operation(db);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
};