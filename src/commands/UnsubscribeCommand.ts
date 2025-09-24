import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { SubscriberService } from "../services/SubscriberService";

export class UnsubscribeCommand implements CommandHandler {
  private subscriberService: SubscriberService;

  constructor(subscriberService: SubscriberService) {
    this.subscriberService = subscriberService;
  }

  register(bot: any): void {
    bot.command("unsubscribe", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply("❌ Не удалось определить ваш ID пользователя");
      return;
    }

    if (!this.subscriberService.isSubscribed(userId)) {
      await ctx.reply("ℹ️ <b>Вы не подписаны</b>\n\nВы не получаете ежедневные сообщения.\nДля подписки используйте команду /subscribe", { parse_mode: "HTML" });
      return;
    }

    this.subscriberService.removeSubscriber(userId);

    await ctx.reply(
      "👋 <b>Вы успешно отписались</b>\n\n" +
      "Больше не будете получать ежедневные сообщения\n\n" +
      "Чтобы снова подписаться, используйте команду /subscribe",
      { parse_mode: "HTML" }
    );

    console.log(`User ${userId} unsubscribed. Total subscribers: ${this.subscriberService.getSubscriberCount()}`);
  }
}
