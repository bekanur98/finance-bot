import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";

export class HelpCommand implements CommandHandler {
  register(bot: any): void {
    bot.command("help", this.execute.bind(this));
    bot.command("команды", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const isGroup = ctx.chat.type !== 'private';

    let helpMessage = `
🤖 <b>Помощь - Финансовый бот НБКР</b>

📊 <b>ОСНОВНЫЕ КОМАНДЫ:</b>
/exchange - Актуальные курсы валют
/gold - Цены на золотые слитки
/calc 100 USD - Валютный калькулятор
/help - Эта справка

🔔 <b>ПОДПИСКА (личные сообщения):</b>
/subscribe - Подписаться на рассылку (09:05)
/unsubscribe - Отписаться от рассылки
/status - Статус подписки

📈 <b>СТАТИСТИКА:</b>
/stats - Статистика использования бота
    `;

    if (isGroup) {
      helpMessage += `
🏢 <b>ДЛЯ ГРУПП (только админы):</b>
/register - Зарегистрировать группу для рассылки
/unregister - Отменить регистрацию группы
      `;
    }

    helpMessage += `
💡 <b>ПРИМЕРЫ КАЛЬКУЛЯТОРА:</b>
• <code>/calc 100 USD</code> - в сомы
• <code>/calc 5000 KGS to USD</code> - в доллары
• <code>/calc 50 EUR to USD</code> - кросс-курс

🌐 <b>Данные:</b> Национальный банк КР (nbkr.kg)
⏰ <b>Рассылка:</b> Ежедневно в 09:05
    `.trim();

    await ctx.reply(helpMessage, { parse_mode: "HTML" });
  }
}
