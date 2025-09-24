import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { GroupService } from "../services/GroupService";

export class UnregisterGroupCommand implements CommandHandler {
  private groupService: GroupService;

  constructor(groupService: GroupService) {
    this.groupService = groupService;
  }

  register(bot: any): void {
    bot.command("unregister", this.execute.bind(this));
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
        "Используйте эту команду в группе, которую хотите отключить от рассылки.",
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
          "Только администраторы группы могут отменить регистрацию бота.",
          { parse_mode: "HTML" }
        );
        return;
      }
    } catch (error) {
      console.error('Error checking admin rights:', error);
      await ctx.reply("❌ Не удалось проверить права администратора");
      return;
    }

    // Проверяем, зарегистрирована ли группа
    if (!this.groupService.isGroupSubscribed(chatId)) {
      await ctx.reply(
        "ℹ️ <b>Группа не зарегистрирована</b>\n\n" +
        "Эта группа не получает ежедневные сообщения.\n" +
        "Для регистрации используйте команду /register",
        { parse_mode: "HTML" }
      );
      return;
    }

    // Отменяем регистрацию группы
    const success = this.groupService.removeGroupSubscriber(chatId);

    if (success) {
      const chatTitle = ctx.chat.title || 'Группа';
      await ctx.reply(
        `👋 <b>Регистрация группы отменена</b>\n\n` +
        `📱 <b>Группа:</b> ${chatTitle}\n` +
        `👤 <b>Отменил:</b> ${ctx.from?.first_name || 'Пользователь'}\n\n` +
        `Группа больше не будет получать ежедневные сообщения\n\n` +
        `Для повторной регистрации используйте /register`,
        { parse_mode: "HTML" }
      );

      console.log(`Group ${chatId} (${chatTitle}) unregistered by user ${userId}`);
    } else {
      await ctx.reply("❌ <b>Ошибка</b>\nНе удалось отменить регистрацию группы", { parse_mode: "HTML" });
    }
  }
}
