import { DatabaseService } from "./DatabaseService";

export interface Alert {
  id?: number;
  userId: number;
  currency: string;
  percentage: number;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export class AlertService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
    this.initializeTables();
  }

  private initializeTables(): void {
    const createAlertsTable = `
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        currency TEXT NOT NULL,
        percentage REAL NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_triggered DATETIME,
        UNIQUE(user_id, currency, percentage)
      )
    `;

    this.db.exec(createAlertsTable);
  }

  addAlert(userId: number, currency: string, percentage: number): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO alerts (user_id, currency, percentage, is_active, created_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(userId, currency, percentage);
      return result.changes > 0;
    } catch (error) {
      console.error("Error adding alert:", error);
      return false;
    }
  }

  getUserAlerts(userId: number): Alert[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM alerts 
        WHERE user_id = ? AND is_active = 1
        ORDER BY created_at DESC
      `);

      const rows = stmt.all(userId) as any[];

      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        currency: row.currency,
        percentage: row.percentage,
        isActive: row.is_active === 1,
        createdAt: new Date(row.created_at),
        lastTriggered: row.last_triggered ? new Date(row.last_triggered) : undefined
      }));
    } catch (error) {
      console.error("Error getting user alerts:", error);
      return [];
    }
  }

  getAllActiveAlerts(): Alert[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM alerts 
        WHERE is_active = 1
        ORDER BY user_id, currency
      `);

      const rows = stmt.all() as any[];

      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        currency: row.currency,
        percentage: row.percentage,
        isActive: row.is_active === 1,
        createdAt: new Date(row.created_at),
        lastTriggered: row.last_triggered ? new Date(row.last_triggered) : undefined
      }));
    } catch (error) {
      console.error("Error getting all alerts:", error);
      return [];
    }
  }

  removeAlert(alertId: number, userId: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE alerts 
        SET is_active = 0 
        WHERE id = ? AND user_id = ?
      `);

      const result = stmt.run(alertId, userId);
      return result.changes > 0;
    } catch (error) {
      console.error("Error removing alert:", error);
      return false;
    }
  }

  removeUserAlert(userId: number, currency: string, percentage: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE alerts 
        SET is_active = 0 
        WHERE user_id = ? AND currency = ? AND percentage = ?
      `);

      const result = stmt.run(userId, currency, percentage);
      return result.changes > 0;
    } catch (error) {
      console.error("Error removing user alert:", error);
      return false;
    }
  }

  updateLastTriggered(alertId: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE alerts 
        SET last_triggered = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);

      const result = stmt.run(alertId);
      return result.changes > 0;
    } catch (error) {
      console.error("Error updating last triggered:", error);
      return false;
    }
  }

  getUserAlertCount(userId: number): number {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM alerts 
        WHERE user_id = ? AND is_active = 1
      `);

      const result = stmt.get(userId) as any;
      return result.count || 0;
    } catch (error) {
      console.error("Error getting user alert count:", error);
      return 0;
    }
  }

  getAlertStats(): { totalAlerts: number; activeUsers: number } {
    try {
      const totalStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM alerts 
        WHERE is_active = 1
      `);

      const usersStmt = this.db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM alerts 
        WHERE is_active = 1
      `);

      const totalResult = totalStmt.get() as any;
      const usersResult = usersStmt.get() as any;

      return {
        totalAlerts: totalResult.count || 0,
        activeUsers: usersResult.count || 0
      };
    } catch (error) {
      console.error("Error getting alert stats:", error);
      return { totalAlerts: 0, activeUsers: 0 };
    }
  }
}
