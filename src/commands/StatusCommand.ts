import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { SubscriberService } from "../services/SubscriberService";

export class StatusCommand implements CommandHandler {
  private subscriberService: SubscriberService;

  constructor(subscriberService: SubscriberService) {
    this.subscriberService = subscriberService;
  }

  register(bot: any): void {
    bot.command("status", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply("❌ Не удалось определить ваш ID пользователя");
      return;
    }

    const isSubscribed = this.subscriberService.isSubscribed(userId);

    if (isSubscribed) {
      await ctx.reply(
        "✅ <b>Статус подписки: Активна</b>\n\n" +
          "Вы получаете ежедневные сообщения в 09:05\n" +
          "Для отписки используйте /unsubscribe",
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(
        "❌ <b>Статус подписки: неактивна</b>\n\n" +
          "Вы не получаете ежедневные сообщения\n" +
          "Для подписки используйте /subscribe",
        { parse_mode: "HTML" }
      );
    }
  }
}
