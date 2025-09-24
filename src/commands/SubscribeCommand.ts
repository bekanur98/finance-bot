import type { CommandContext } from "grammy";
import type { CommandHandler, Subscriber } from "../types";
import { SubscriberService } from "../services/SubscriberService";

export class SubscribeCommand implements CommandHandler {
  private subscriberService: SubscriberService;

  constructor(subscriberService: SubscriberService) {
    this.subscriberService = subscriberService;
  }

  register(bot: any): void {
    bot.command("subscribe", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply("❌ Не удалось определить ваш ID пользователя");
      return;
    }

    if (this.subscriberService.isSubscribed(userId)) {
      await ctx.reply("✅ <b>Вы уже подписаны!</b>\n\nВы получаете ежедневные сообщения в 09:05", { parse_mode: "HTML" });
      return;
    }

    if (!ctx.from) {
      await ctx.reply("❌ Не удалось получить информацию о вашем профиле");
      return;
    }

    const subscriber: Subscriber = {
      id: userId,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
      subscribedAt: new Date()
    };

    this.subscriberService.addSubscriber(subscriber);

    let personalGreeting: string;
    if (ctx.from.first_name) {
      personalGreeting = `Добро пожаловать, ${ctx.from.first_name}! 👋`;
    } else if (ctx.from.username) {
      personalGreeting = `Добро пожаловать, @${ctx.from.username}! 👋`;
    } else {
      personalGreeting = "Добро пожаловать! 👋";
    }

    await ctx.reply(
      `${personalGreeting}\n\n` +
      "🎉 <b>Подписка оформлена!</b>\n\n" +
      "Теперь вы будете получать ежедневные сообщения в 09:05\n\n" +
      "Чтобы отписаться, используйте команду /unsubscribe",
      { parse_mode: "HTML" }
    );

    console.log(`User ${userId} subscribed. Total subscribers: ${this.subscriberService.getSubscriberCount()}`);
  }
}
