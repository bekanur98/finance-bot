import cron from "node-cron";
import { Bot } from "grammy";
import { AlertService } from "./AlertService";
import { NBKRParserService } from "./NBKRParserService";
import { DatabaseService } from "./DatabaseService";

interface CurrencyRate {
  currency: string;
  rate: number;
  timestamp: Date;
}

export class AlertMonitorService {
  private alertService: AlertService;
  private parserService: NBKRParserService;
  private db: DatabaseService;
  private bot: Bot;
  private previousRates: Map<string, number> = new Map();

  constructor(alertService: AlertService, parserService: NBKRParserService, db: DatabaseService, bot: Bot) {
    this.alertService = alertService;
    this.parserService = parserService;
    this.db = db;
    this.bot = bot;
    this.initializeTables();
  }

  private initializeTables(): void {
    // Создаем таблицу для хранения исторических курсов
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS currency_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency TEXT NOT NULL,
        rate REAL NOT NULL,
        change_percent REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создаем индексы отдельно
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_currency_history_currency 
      ON currency_history(currency)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_currency_history_timestamp 
      ON currency_history(timestamp)
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_currency_history_currency_timestamp 
      ON currency_history(currency, timestamp)
    `);
  }

  startMonitoring(): void {
    // Проверяем курсы каждый час в будние дни
    cron.schedule("0 */1 * * 1-5", async () => {
      await this.checkRatesAndSendAlerts();
    });

    // Проверяем курсы каждые 6 часов в выходные дни
    cron.schedule("0 */6 * * 0,6", async () => {
      await this.checkRatesAndSendAlerts();
    });

    // Загружаем начальные курсы при старте
    setTimeout(() => {
      this.loadInitialRates();
    }, 5000);

    console.log("🔔 Alert monitoring service started");
  }

  private async loadInitialRates(): Promise<void> {
    try {
      const rates = await this.parserService.getCurrencyRates();

      for (const rate of rates) {
        const numericRate = parseFloat(rate.rate.replace(",", "."));
        if (!isNaN(numericRate)) {
          this.previousRates.set(rate.currency, numericRate);
        }
      }

      console.log(`📊 Loaded initial rates for ${this.previousRates.size} currencies`);
    } catch (error) {
      console.error("Error loading initial rates:", error);
    }
  }

  private async checkRatesAndSendAlerts(): Promise<void> {
    try {
      console.log("🔍 Checking currency rates for alerts...");

      const currentRates = await this.parserService.getCurrencyRates();
      const alerts = this.alertService.getAllActiveAlerts();

      if (alerts.length === 0) {
        console.log("ℹ️ No active alerts to check");
        return;
      }

      const triggeredAlerts: Array<{
        alert: any;
        oldRate: number;
        newRate: number;
        changePercent: number;
      }> = [];

      for (const rate of currentRates) {
        const numericRate = parseFloat(rate.rate.replace(",", "."));
        if (isNaN(numericRate)) continue;

        const currency = rate.currency;
        const previousRate = this.previousRates.get(currency);

        if (previousRate) {
          const changePercent = Math.abs(((numericRate - previousRate) / previousRate) * 100);

          // Сохраняем в историю если изменение больше 0.1%
          if (changePercent >= 0.1) {
            this.saveRateToHistory(currency, numericRate, changePercent);
          }

          // Проверяем алерты для этой валюты
          const currencyAlerts = alerts.filter(alert => alert.currency === currency);

          for (const alert of currencyAlerts) {
            if (changePercent >= alert.percentage) {
              triggeredAlerts.push({
                alert,
                oldRate: previousRate,
                newRate: numericRate,
                changePercent
              });
            }
          }
        }

        // Обновляем текущий курс
        this.previousRates.set(currency, numericRate);
      }

      // Отправляем уведомления для сработавших алертов
      if (triggeredAlerts.length > 0) {
        console.log(`🚨 Found ${triggeredAlerts.length} triggered alerts`);
        await this.sendAlertNotifications(triggeredAlerts);
      } else {
        console.log("✅ No alerts triggered");
      }

    } catch (error) {
      console.error("Error checking rates and alerts:", error);
    }
  }

  private saveRateToHistory(currency: string, rate: number, changePercent: number): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO currency_history (currency, rate, change_percent)
        VALUES (?, ?, ?)
      `);
      stmt.run(currency, rate, changePercent);
    } catch (error) {
      console.error("Error saving rate to history:", error);
    }
  }

  private async sendAlertNotifications(triggeredAlerts: Array<{
    alert: any;
    oldRate: number;
    newRate: number;
    changePercent: number;
  }>): Promise<void> {

    // Группируем алерты по пользователям
    const userAlerts = new Map<number, Array<typeof triggeredAlerts[0]>>();

    for (const triggered of triggeredAlerts) {
      const userId = triggered.alert.userId;
      if (!userAlerts.has(userId)) {
        userAlerts.set(userId, []);
      }
      userAlerts.get(userId)!.push(triggered);
    }

    // Отправляем уведомления каждому пользователю
    for (const [userId, userTriggeredAlerts] of userAlerts) {
      try {
        await this.sendUserAlertNotification(userId, userTriggeredAlerts);

        // Обновляем время последнего срабатывания для всех алертов пользователя
        for (const triggered of userTriggeredAlerts) {
          this.alertService.updateLastTriggered(triggered.alert.id);
        }

        // Задержка между пользователями
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error sending alert to user ${userId}:`, error);
      }
    }
  }

  private async sendUserAlertNotification(userId: number, triggeredAlerts: Array<{
    alert: any;
    oldRate: number;
    newRate: number;
    changePercent: number;
  }>): Promise<void> {

    let message = `🚨 <b>Алерт: Значительное изменение курса!</b>\n\n`;

    for (const triggered of triggeredAlerts) {
      const { alert, oldRate, newRate, changePercent } = triggered;
      const direction = newRate > oldRate ? "📈" : "📉";
      const changeDirection = newRate > oldRate ? "вырос" : "упал";

      const currencyFlag = this.getCurrencyFlag(alert.currency);

      message += `${direction} ${currencyFlag} <b>${alert.currency}</b>\n`;
      message += `├ Было: <code>${oldRate.toFixed(4)}</code> сом\n`;
      message += `├ Стало: <code>${newRate.toFixed(4)}</code> сом\n`;
      message += `└ Изменение: <b>${changePercent.toFixed(2)}%</b> (${changeDirection})\n\n`;
    }

    message += `⏰ <i>${new Date().toLocaleString('ru-RU')}</i>\n`;
    message += `📊 <i>Данные: Национальный банк КР</i>\n\n`;
    message += `💡 Управление алертами: /мои_алерты`;

    await this.bot.api.sendMessage(userId, message, {
      parse_mode: "HTML"
    });

    console.log(`📤 Alert notification sent to user ${userId} for ${triggeredAlerts.length} currencies`);
  }

  private getCurrencyFlag(currency: string): string {
    const flags: Record<string, string> = {
      "USD": "🇺🇸",
      "EUR": "🇪🇺",
      "RUB": "🇷🇺",
      "KZT": "🇰🇿",
      "CNY": "🇨🇳",
      "TRY": "🇹🇷",
      "KGS": "🇰🇬"
    };
    return flags[currency] || "💱";
  }

  // Метод для получения статистики мониторинга
  getMonitoringStats(): {
    trackedCurrencies: number;
    totalAlerts: number;
    lastCheck: Date | null;
  } {
    return {
      trackedCurrencies: this.previousRates.size,
      totalAlerts: this.alertService.getAllActiveAlerts().length,
      lastCheck: new Date() // В реальности можно сохранять время последней проверки
    };
  }

  // Метод для ручной проверки (для тестирования)
  async manualCheck(): Promise<void> {
    console.log("🔍 Manual alert check triggered");
    await this.checkRatesAndSendAlerts();
  }
}
