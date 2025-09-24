import type { CommandContext } from "grammy";
import type { CommandHandler, GroupSubscriber } from "../types";
import { GroupService } from "../services/GroupService";

export class RegisterGroupCommand implements CommandHandler {
  private groupService: GroupService;

  constructor(groupService: GroupService) {
    this.groupService = groupService;
  }

  register(bot: any): void {
    bot.command("register", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply("❌ Не удалось определить ваш ID пользователя");
      return;
    }

    // Проверяем, что команда вызвана в группе
    if (ctx.chat.type === 'private') {
      await ctx.reply(
        "❌ <b>Эта команда работает только в группах!</b>\n\n" +
        "Добавьте бота в группу и используйте команду /register там.",
        { parse_mode: "HTML" }
      );
      return;
    }

    // Проверяем права администратора
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      if (member.status !== 'administrator' && member.status !== 'creator') {
        await ctx.reply(
          "❌ <b>Недостаточно прав!</b>\n\n" +
          "Только администраторы группы могут регистрировать бота для рассылки.",
          { parse_mode: "HTML" }
        );
        return;
      }
    } catch (error) {
      console.error('Error checking admin rights:', error);
      await ctx.reply("❌ Не удалось проверить права администратора");
      return;
    }

    // Проверяем, не зарегистрирована ли уже группа
    if (this.groupService.isGroupSubscribed(chatId)) {
      await ctx.reply(
        "✅ <b>Группа уже зарегистрирована!</b>\n\n" +
        "Эта группа уже получает ежедневные сообщения в 09:05\n" +
        "Для отмены регистрации используйте /unregister",
        { parse_mode: "HTML" }
      );
      return;
    }

    // Регистрируем группу
    const groupSubscriber: GroupSubscriber = {
      chatId: chatId,
      chatTitle: ctx.chat.title,
      chatType: ctx.chat.type as 'group' | 'supergroup' | 'channel',
      registeredBy: userId,
      subscribedAt: new Date()
    };

    const success = this.groupService.addGroupSubscriber(groupSubscriber);

    if (success) {
      const chatTitle = ctx.chat.title || 'Эта группа';
      await ctx.reply(
        `🎉 <b>Группа успешно зарегистрирована!</b>\n\n` +
        `📱 <b>Группа:</b> ${chatTitle}\n` +
        `👤 <b>Зарегистрировал:</b> ${ctx.from?.first_name || 'Пользователь'}\n\n` +
        `Теперь группа будет получать ежедневные сообщения в 09:05\n\n` +
        `Для отмены регистрации используйте /unregister`,
        { parse_mode: "HTML" }
      );

      console.log(`Group ${chatId} (${chatTitle}) registered by user ${userId}`);
    } else {
      await ctx.reply("❌ <b>Ошибка</b>\nНе удалось зарегистрировать группу", { parse_mode: "HTML" });
    }
  }
}
