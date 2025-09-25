import Database from 'better-sqlite3';
import path from 'path';
import type { Subscriber, GroupSubscriber } from '../types';

export interface DatabaseSubscriber {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  subscribedAt: string;
  isActive: number; // SQLite uses integers for booleans
}

export interface DatabaseGroupSubscriber {
  chatId: number;
  chatTitle?: string;
  chatType: string;
  registeredBy: number;
  subscribedAt: string;
  isActive: number;
}

export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // Create database in project root or use provided path
    const defaultPath = path.join(process.cwd(), 'bot.db');
    this.db = new Database(dbPath || defaultPath);

    // Enable foreign keys and WAL mode for better performance
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');

    this.initTables();
  }

  private initTables(): void {
    // Create subscribers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY,
        firstName TEXT,
        lastName TEXT,
        username TEXT,
        subscribedAt TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create group_subscribers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS group_subscribers (
        chatId INTEGER PRIMARY KEY,
        chatTitle TEXT,
        chatType TEXT NOT NULL,
        registeredBy INTEGER NOT NULL,
        subscribedAt TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_subscribers_active 
      ON subscribers(isActive);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_group_subscribers_active 
      ON group_subscribers(isActive);
    `);

    console.log('✅ Database tables initialized');
  }

  // Subscriber operations
  addSubscriber(subscriber: Subscriber): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO subscribers 
        (id, firstName, lastName, username, subscribedAt, isActive)
        VALUES (?, ?, ?, ?, ?, 1)
      `);

      const result = stmt.run(
        subscriber.id,
        subscriber.firstName || null,
        subscriber.lastName || null,
        subscriber.username || null,
        subscriber.subscribedAt.toISOString()
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error adding subscriber:', error);
      return false;
    }
  }

  removeSubscriber(userId: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE subscribers 
        SET isActive = 0, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ? AND isActive = 1
      `);

      const result = stmt.run(userId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error removing subscriber:', error);
      return false;
    }
  }

  isSubscribed(userId: number): boolean {
    try {
      const stmt = this.db.prepare(`
        SELECT id FROM subscribers 
        WHERE id = ? AND isActive = 1
      `);

      const result = stmt.get(userId);
      return !!result;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  getSubscribers(): Subscriber[] {
    try {
      const stmt = this.db.prepare(`
        SELECT id, firstName, lastName, username, subscribedAt
        FROM subscribers 
        WHERE isActive = 1
        ORDER BY subscribedAt DESC
      `);

      const rows = stmt.all() as DatabaseSubscriber[];

      return rows.map(row => ({
        id: row.id,
        firstName: row.firstName || undefined,
        lastName: row.lastName || undefined,
        username: row.username || undefined,
        subscribedAt: new Date(row.subscribedAt)
      }));
    } catch (error) {
      console.error('Error getting subscribers:', error);
      return [];
    }
  }

  getSubscriberCount(): number {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM subscribers 
        WHERE isActive = 1
      `);

      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      console.error('Error getting subscriber count:', error);
      return 0;
    }
  }

  getSubscriberById(userId: number): Subscriber | null {
    try {
      const stmt = this.db.prepare(`
        SELECT id, firstName, lastName, username, subscribedAt
        FROM subscribers 
        WHERE id = ? AND isActive = 1
      `);

      const row = stmt.get(userId) as DatabaseSubscriber;

      if (!row) return null;

      return {
        id: row.id,
        firstName: row.firstName || undefined,
        lastName: row.lastName || undefined,
        username: row.username || undefined,
        subscribedAt: new Date(row.subscribedAt)
      };
    } catch (error) {
      console.error('Error getting subscriber by ID:', error);
      return null;
    }
  }

  // Group operations
  addGroupSubscriber(group: GroupSubscriber): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO group_subscribers 
        (chatId, chatTitle, chatType, registeredBy, subscribedAt, isActive)
        VALUES (?, ?, ?, ?, ?, 1)
      `);

      const result = stmt.run(
        group.chatId,
        group.chatTitle || null,
        group.chatType,
        group.registeredBy,
        group.subscribedAt.toISOString()
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error adding group subscriber:', error);
      return false;
    }
  }

  removeGroupSubscriber(chatId: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE group_subscribers 
        SET isActive = 0, updatedAt = CURRENT_TIMESTAMP 
        WHERE chatId = ? AND isActive = 1
      `);

      const result = stmt.run(chatId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error removing group subscriber:', error);
      return false;
    }
  }

  isGroupSubscribed(chatId: number): boolean {
    try {
      const stmt = this.db.prepare(`
        SELECT chatId FROM group_subscribers 
        WHERE chatId = ? AND isActive = 1
      `);

      const result = stmt.get(chatId);
      return !!result;
    } catch (error) {
      console.error('Error checking group subscription:', error);
      return false;
    }
  }

  getGroupSubscribers(): GroupSubscriber[] {
    try {
      const stmt = this.db.prepare(`
        SELECT chatId, chatTitle, chatType, registeredBy, subscribedAt
        FROM group_subscribers 
        WHERE isActive = 1
        ORDER BY subscribedAt DESC
      `);

      const rows = stmt.all() as DatabaseGroupSubscriber[];

      return rows.map(row => ({
        chatId: row.chatId,
        chatTitle: row.chatTitle || "",
        chatType: row.chatType as 'group' | 'supergroup' | 'channel',
        registeredBy: row.registeredBy,
        subscribedAt: new Date(row.subscribedAt)
      }));
    } catch (error) {
      console.error('Error getting group subscribers:', error);
      return [];
    }
  }

  getGroupSubscriberCount(): number {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM group_subscribers 
        WHERE isActive = 1
      `);

      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      console.error('Error getting group subscriber count:', error);
      return 0;
    }
  }

  // Database maintenance
  cleanup(): void {
    try {
      // Clean up old inactive subscribers (older than 30 days)
      const stmt = this.db.prepare(`
        DELETE FROM subscribers 
        WHERE isActive = 0 
        AND updatedAt < datetime('now', '-30 days')
      `);

      const result = stmt.run();
      if (result.changes > 0) {
        console.log(`🧹 Cleaned up ${result.changes} old inactive subscribers`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Database statistics
  getStats(): { totalSubscribers: number; activeSubscribers: number; inactiveSubscribers: number } {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN isActive = 0 THEN 1 ELSE 0 END) as inactive
        FROM subscribers
      `);

      const result = stmt.get() as { total: number; active: number; inactive: number };

      return {
        totalSubscribers: result.total,
        activeSubscribers: result.active,
        inactiveSubscribers: result.inactive
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { totalSubscribers: 0, activeSubscribers: 0, inactiveSubscribers: 0 };
    }
  }

  // Get database instance for direct access
  getDb(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }

  // Public methods for direct database access (used by other services)
  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }
}
