import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { AlertService } from "../services/AlertService";

export class AlertCommand implements CommandHandler {
  private alertService: AlertService;

  constructor(alertService: AlertService) {
    this.alertService = alertService;
  }

  register(bot: any): void {
    bot.command("alert", this.execute.bind(this));
    bot.command("уведомления", this.execute.bind(this));
    bot.command("alerts", this.execute.bind(this));
    bot.command("мои_алерты", this.showMyAlerts.bind(this));
    bot.command("myalerts", this.showMyAlerts.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const args = ctx.match?.toString().trim();
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply("❌ Не удалось определить ваш ID пользователя");
      return;
    }

    if (!args) {
      await ctx.reply(
        "🔔 <b>Настройка алертов</b>\n\n" +
        "<b>Доступные команды:</b>\n" +
        "• <code>/alert USD 2%</code> - уведомления при изменении USD >2%\n" +
        "• <code>/alert EUR 5%</code> - уведомления при изменении EUR >5%\n" +
        "• <code>/alert list</code> - список ваших алертов\n" +
        "• <code>/мои_алерты</code> - быстрый просмотр алертов\n" +
        "• <code>/alert remove USD 2%</code> - удалить конкретный алерт\n\n" +
        "<b>Поддерживаемые валюты:</b> USD, EUR, RUB, KZT, CNY, TRY",
        { parse_mode: "HTML" }
      );
      return;
    }

    const parts = args.split(' ');
    const action = parts[0].toLowerCase();

    if (action === 'list') {
      await this.showUserAlerts(ctx, userId);
    } else if (action === 'remove' && parts.length >= 3) {
      const currency = parts[1].toUpperCase();
      const percentage = parseFloat(parts[2].replace('%', ''));
      await this.removeAlert(ctx, userId, currency, percentage);
    } else if (parts.length >= 2) {
      const currency = parts[0].toUpperCase();
      const threshold = parts[1];
      await this.addAlert(ctx, userId, currency, threshold);
    } else {
      await ctx.reply("❌ Неверный формат команды. Используйте /alert для справки.");
    }
  }

  async showMyAlerts(ctx: CommandContext<any>): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply("❌ Не удалось определить ваш ID пользователя");
      return;
    }

    await this.showUserAlerts(ctx, userId);
  }

  private async showUserAlerts(ctx: CommandContext<any>, userId: number): Promise<void> {
    const userAlerts = this.alertService.getUserAlerts(userId);

    if (userAlerts.length === 0) {
      await ctx.reply(
        "📋 <b>Ваши алерты</b>\n\n" +
        "❌ У вас пока нет активных алертов\n\n" +
        "💡 Создайте алерт командой:\n" +
        "<code>/alert USD 2%</code> - для уведомлений о изменении курса USD на 2% или больше",
        { parse_mode: "HTML" }
      );
      return;
    }

    let message = "📋 <b>Ваши активные алерты:</b>\n\n";

    userAlerts.forEach((alert, index) => {
      const currencyFlag = this.getCurrencyFlag(alert.currency);
      message += `${index + 1}. ${currencyFlag} <b>${alert.currency}</b> - <code>${alert.percentage}%</code>\n`;
      message += `   📅 Создан: ${alert.createdAt.toLocaleDateString('ru-RU')}\n`;
      if (alert.lastTriggered) {
        message += `   🔔 Последнее срабатывание: ${alert.lastTriggered.toLocaleDateString('ru-RU')}\n`;
      }
      message += `\n`;
    });

    message += `🔔 <i>Всего алертов: ${userAlerts.length}</i>\n\n`;
    message += `💡 <b>Удалить алерт:</b> <code>/alert remove USD 2%</code>`;

    await ctx.reply(message, { parse_mode: "HTML" });
  }

  private async addAlert(ctx: CommandContext<any>, userId: number, currency: string, threshold: string): Promise<void> {
    const supportedCurrencies = ['USD', 'EUR', 'RUB', 'KZT', 'CNY', 'TRY'];

    if (!supportedCurrencies.includes(currency)) {
      await ctx.reply("❌ Валюта не поддерживается. Доступные: USD, EUR, RUB, KZT, CNY, TRY");
      return;
    }

    const numericThreshold = parseFloat(threshold.replace('%', ''));
    if (isNaN(numericThreshold) || numericThreshold <= 0 || numericThreshold > 100) {
      await ctx.reply("❌ Порог должен быть числом от 0.1% до 100%");
      return;
    }

    const success = this.alertService.addAlert(userId, currency, numericThreshold);

    if (success) {
      const currencyFlag = this.getCurrencyFlag(currency);
      await ctx.reply(
        `✅ <b>Алерт создан!</b>\n\n` +
        `${currencyFlag} <b>${currency}</b> - <code>${numericThreshold}%</code>\n\n` +
        `🔔 Вы получите уведомление, когда курс ${currency} изменится на ${numericThreshold}% или больше\n\n` +
        `📋 Просмотреть все алерты: <code>/мои_алерты</code>`,
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(
        `⚠️ <b>Алерт уже существует</b>\n\n` +
        `У вас уже есть алерт для <b>${currency}</b> с процентом <b>${numericThreshold}%</b>\n\n` +
        `📋 Просмотреть все алерты: <code>/мои_алерты</code>`,
        { parse_mode: "HTML" }
      );
    }
  }

  private async removeAlert(ctx: CommandContext<any>, userId: number, currency: string, percentage: number): Promise<void> {
    const success = this.alertService.removeUserAlert(userId, currency, percentage);

    if (success) {
      const currencyFlag = this.getCurrencyFlag(currency);
      await ctx.reply(
        `✅ <b>Алерт удален</b>\n\n` +
        `${currencyFlag} <b>${currency}</b> - <code>${percentage}%</code>\n\n` +
        `📋 Оставшиеся алерты: <code>/мои_алерты</code>`,
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(
        `❌ <b>Алерт не найден</b>\n\n` +
        `Алерт для <b>${currency}</b> с процентом <b>${percentage}%</b> не существует\n\n` +
        `📋 Просмотреть все алерты: <code>/мои_алерты</code>`,
        { parse_mode: "HTML" }
      );
    }
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
}
