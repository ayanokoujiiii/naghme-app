import * as SQLite from 'expo-sqlite';
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_VERSION } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  try {
    console.log('[DB] Opening database file: naghme.db');
    const db = await SQLite.openDatabaseAsync('naghme.db');
    console.log('[DB] Database file opened, setting pragmas');

    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    console.log('[DB] Pragmas set successfully');

    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const version = row?.user_version ?? 0;
    console.log('[DB] Current schema version:', version);

    if (version < 1) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(SCHEMA_V1);
        await db.execAsync(SCHEMA_V2);
        await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      });
    } else if (version < 2) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(SCHEMA_V2);
        await db.execAsync('PRAGMA user_version = 2');
      });
    }
    console.log('[DB] Database initialization complete');
    return db;
  } catch (e: any) {
    console.error('[DB] Database open error:', e?.message);
    console.error('[DB] Full error:', e);
    throw new Error(`Database initialization failed: ${e?.message}`);
  }
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

/** Bump after any write so open screens refresh themselves. */
export function notifyChange() {
  version++;
  listeners.forEach((l) => l());
}
export function subscribeChanges(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const dataVersion = () => version;
