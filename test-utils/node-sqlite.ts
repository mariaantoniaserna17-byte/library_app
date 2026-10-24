import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

export function createTestDb(): SQLiteDatabase {
  const database = new DatabaseSync(':memory:');
  const values = (params: unknown[]) =>
    params as (string | number | bigint | null | Uint8Array)[];
  const db = {
    execAsync(sql: string) {
      database.exec(sql);
      return Promise.resolve();
    },
    async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
      const row = database.prepare(sql).get(...values(params)) as T | undefined;
      return row ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      return database.prepare(sql).all(...values(params)) as T[];
    },
    async runAsync(sql: string, ...params: unknown[]): Promise<void> {
      database.prepare(sql).run(...values(params));
    },
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      database.exec('BEGIN');
      try {
        await task();
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return db as unknown as SQLiteDatabase;
}
