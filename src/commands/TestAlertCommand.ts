import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { AlertMonitorService } from "../services/AlertMonitorService";

export class TestAlertCommand implements CommandHandler {
  private alertMonitorService: AlertMonitorService;

  constructor(alertMonitorService: AlertMonitorService) {
    this.alertMonitorService = alertMonitorService;
  }

  register(bot: any): void {
    bot.command("test_alerts", this.execute.bind(this));
    bot.command("тест_алертов", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply("❌ Не удалось определить ваш ID пользователя");
      return;
    }

    // Проверяем права (можно добавить проверку на админа)
    const adminIds = [393871193]; // Ваш ID для тестирования
    if (!adminIds.includes(userId)) {
      await ctx.reply("❌ Недостаточно прав для выполнения этой команды");
      return;
    }

    await ctx.reply("🔍 <b>Запускаю тестовую проверку алертов...</b>\n\nПроверяю текущие курсы и ищу сработавшие алерты...", {
      parse_mode: "HTML"
    });

    try {
      // Запускаем ручную проверку алертов
      await this.alertMonitorService.manualCheck();

      const stats = this.alertMonitorService.getMonitoringStats();

      await ctx.reply(
        `✅ <b>Тестовая проверка завершена!</b>\n\n` +
        `📊 <b>Статистика мониторинга:</b>\n` +
        `├ Отслеживаемых валют: <code>${stats.trackedCurrencies}</code>\n` +
        `├ Активных алертов: <code>${stats.totalAlerts}</code>\n` +
        `└ Время проверки: <code>${stats.lastCheck?.toLocaleString('ru-RU')}</code>\n\n` +
        `💡 Если у вас есть активные алерты и курсы изменились значительно, вы получите уведомления.`,
        { parse_mode: "HTML" }
      );

    } catch (error) {
      console.error("Test alert error:", error);
      await ctx.reply("❌ <b>Ошибка при тестировании алертов</b>\n\nПроверьте логи сервера для подробностей.", {
        parse_mode: "HTML"
      });
    }
  }
}
