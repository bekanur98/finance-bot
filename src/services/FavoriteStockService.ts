import { DatabaseService } from "./DatabaseService";

export interface FavoriteStock {
  id?: number;
  userId: number;
  symbol: string;
  name: string;
  addedAt: Date;
}

export class FavoriteStockService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
    this.initializeTables();
  }

  private initializeTables(): void {
    // Создаем таблицу для избранных акций
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS favorite_stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, symbol)
      )
    `);

    // Создаем индексы
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_favorite_stocks_user_id 
      ON favorite_stocks(user_id)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_favorite_stocks_symbol 
      ON favorite_stocks(symbol)
    `);
  }

  addFavorite(userId: number, symbol: string, name: string): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO favorite_stocks (user_id, symbol, name, added_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(userId, symbol.toUpperCase(), name);
      return result.changes > 0;
    } catch (error) {
      console.error("Error adding favorite stock:", error);
      return false;
    }
  }

  removeFavorite(userId: number, symbol: string): boolean {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM favorite_stocks 
        WHERE user_id = ? AND symbol = ?
      `);

      const result = stmt.run(userId, symbol.toUpperCase());
      return result.changes > 0;
    } catch (error) {
      console.error("Error removing favorite stock:", error);
      return false;
    }
  }

  getUserFavorites(userId: number): FavoriteStock[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM favorite_stocks 
        WHERE user_id = ?
        ORDER BY added_at DESC
      `);

      const rows = stmt.all(userId) as any[];

      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        symbol: row.symbol,
        name: row.name,
        addedAt: new Date(row.added_at)
      }));
    } catch (error) {
      console.error("Error getting user favorites:", error);
      return [];
    }
  }

  isFavorite(userId: number, symbol: string): boolean {
    try {
      const stmt = this.db.prepare(`
        SELECT id FROM favorite_stocks 
        WHERE user_id = ? AND symbol = ?
      `);

      const result = stmt.get(userId, symbol.toUpperCase());
      return !!result;
    } catch (error) {
      console.error("Error checking favorite:", error);
      return false;
    }
  }

  getFavoriteCount(userId: number): number {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM favorite_stocks 
        WHERE user_id = ?
      `);

      const result = stmt.get(userId) as any;
      return result.count || 0;
    } catch (error) {
      console.error("Error getting favorite count:", error);
      return 0;
    }
  }

  getPopularStocks(): Array<{ symbol: string; count: number }> {
    try {
      const stmt = this.db.prepare(`
        SELECT symbol, COUNT(*) as count
        FROM favorite_stocks 
        GROUP BY symbol
        ORDER BY count DESC
        LIMIT 10
      `);

      const rows = stmt.all() as any[];

      return rows.map(row => ({
        symbol: row.symbol,
        count: row.count
      }));
    } catch (error) {
      console.error("Error getting popular stocks:", error);
      return [];
    }
  }

  getFavoriteStats(): { totalFavorites: number; activeUsers: number; popularStock: string | null } {
    try {
      const totalStmt = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM favorite_stocks
      `);

      const usersStmt = this.db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM favorite_stocks
      `);

      const popularStmt = this.db.prepare(`
        SELECT symbol, COUNT(*) as count
        FROM favorite_stocks 
        GROUP BY symbol
        ORDER BY count DESC
        LIMIT 1
      `);

      const totalResult = totalStmt.get() as any;
      const usersResult = usersStmt.get() as any;
      const popularResult = popularStmt.get() as any;

      return {
        totalFavorites: totalResult.count || 0,
        activeUsers: usersResult.count || 0,
        popularStock: popularResult?.symbol || null
      };
    } catch (error) {
      console.error("Error getting favorite stats:", error);
      return { totalFavorites: 0, activeUsers: 0, popularStock: null };
    }
  }
}
