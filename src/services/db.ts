import { openDB, type IDBPDatabase } from 'idb';

interface MachineShopDB {
  inventory: {
    key: number;
    value: {
      id: number;
      name: string;
      quantity: number;
      description?: string;
      threshold: number;
    };
    indexes: { 'by-name': string };
  };
  barrels: {
    key: number;
    value: {
      id: number;
      type: string;
      filled: boolean;
    };
    indexes: { 'by-type': string };
  };
}

let dbInstance: IDBPDatabase<MachineShopDB> | null = null;

export async function initDB() {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB<MachineShopDB>('machine-shop-db', 1, {
      upgrade(db, oldVersion, newVersion) {
        console.log('Database upgrade running:', { oldVersion, newVersion });
        
        if (!db.objectStoreNames.contains('inventory')) {
          console.log('Creating inventory store');
          const inventoryStore = db.createObjectStore('inventory', {
            keyPath: 'id',
            autoIncrement: true
          });
          inventoryStore.createIndex('by-name', 'name');
        }

        if (!db.objectStoreNames.contains('barrels')) {
          console.log('Creating barrels store');
          const barrelStore = db.createObjectStore('barrels', {
            keyPath: 'id',
            autoIncrement: true
          });
          barrelStore.createIndex('by-type', 'type');
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
      }
    });

    return dbInstance;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export async function getDB() {
  if (!dbInstance) {
    await initDB();
  }
  return dbInstance!;
}

export async function withDB<T>(operation: (db: IDBPDatabase<MachineShopDB>) => Promise<T>) {
  const db = await getDB();
  try {
    return await operation(db);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}