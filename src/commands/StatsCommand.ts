import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { SubscriberService } from "../services/SubscriberService";
import { GroupService } from "../services/GroupService";

export class StatsCommand implements CommandHandler {
  private subscriberService: SubscriberService;
  private groupService: GroupService;

  constructor(subscriberService: SubscriberService, groupService: GroupService) {
    this.subscriberService = subscriberService;
    this.groupService = groupService;
  }

  register(bot: any): void {
    bot.command("stats", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    try {
      const userStats = this.subscriberService.getStats();
      const groupCount = this.groupService.getGroupSubscriberCount();

      const message = `
📊 <b>Статистика бота</b>

👥 <b>Индивидуальные подписчики:</b>
├ Активные: <code>${userStats.activeSubscribers}</code>
├ Неактивные: <code>${userStats.inactiveSubscribers}</code>
└ Всего: <code>${userStats.totalSubscribers}</code>

🏢 <b>Зарегистрированные группы:</b>
└ Активные: <code>${groupCount}</code>

📈 <b>Общая аудитория рассылки:</b>
└ <code>${userStats.activeSubscribers + groupCount}</code> получателей

📅 <i>Обновлено: ${new Date().toLocaleString('ru-RU')}</i>
      `.trim();

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Stats error:", error);
      await ctx.reply("❌ <b>Ошибка</b>\nНе удалось получить статистику", { parse_mode: "HTML" });
    }
  }
}
