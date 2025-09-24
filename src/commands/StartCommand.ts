import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { KeyboardService } from "../services/KeyboardService";

export class StartCommand implements CommandHandler {
  register(bot: any): void {
    bot.command("start", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    if (ctx.from !== undefined) {
      console.log(ctx.from.id);
    }

    const userName = ctx.from?.first_name || "пользователь";
    const isGroup = ctx.chat.type !== 'private';

    let welcomeMessage = `
👋 Привет, ${userName}!

🤖 <b>Финансовый бот НБКР</b>
Актуальные курсы валют и цены на золото

📊 <b>Используйте кнопки ниже для навигации:</b>
💱 Курсы валют и цены на золото
🧮 Валютный калькулятор с быстрым вводом
🔔 Персональные алерты и уведомления
📊 Статистика и аналитика

📈 <b>Либо команды:</b>
• /calc 100 USD - Быстрый расчет
• /exchange - Актуальные курсы
• /help - Полная справка
    `;

    if (!isGroup) {
      welcomeMessage += `\n🔔 <b>Доступна персональная рассылка в 09:05</b>`;
    } else {
      welcomeMessage += `\n🏢 <b>Для групп доступна регистрация рассылки</b>`;
    }

    welcomeMessage += `\n\n⚡️ Начните с главного меню! 👇`;

    // Отправляем приветствие с главным меню
    await ctx.reply(welcomeMessage, {
      parse_mode: "HTML",
      reply_markup: KeyboardService.getMainMenu()
    });

    // Также устанавливаем постоянную клавиатуру снизу
    if (!isGroup) {
      await ctx.reply("🔥 <b>Быстрый доступ:</b>", {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getPersistentKeyboard()
      });
    }
  }
}
