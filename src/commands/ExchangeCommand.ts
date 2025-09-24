import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { NBKRParserService } from "../services/NBKRParserService";
import { KeyboardService } from "../services/KeyboardService";

export class ExchangeCommand implements CommandHandler {
  private parserService: NBKRParserService;

  constructor(parserService: NBKRParserService) {
    this.parserService = parserService;
  }

  register(bot: any): void {
    bot.command("exchange", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const loadingMessage = await ctx.reply("⏳ Получаю актуальные курсы валют...");

    try {
      console.log("Fetching currency data...");

      const today = new Date();
      const formattedDate = today.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const rates = await this.parserService.getCurrencyRates();

      if (rates.length === 0) {
        throw new Error("Не удалось получить курсы валют");
      }

      let result = `💰 <b>Курсы валют НБКР</b>\n📅 <i>${formattedDate}</i>\n\n`;

      rates.forEach((rate) => {
        result += `${rate.flag} <b>${rate.currency}</b>  ➤  <code>${rate.rate}</code> сом\n`;
      });

      result += `\n<i>📊 Источник: Национальный банк КР</i>\n<i>🌐 nbkr.kg</i>`;

      // Добавляем интерактивные кнопки
      const keyboard = KeyboardService.getQuickExchangeMenu();

      await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id);
      await ctx.reply(result, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });

    } catch (error) {
      console.error("Exchange error:", error);

      try {
        await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id);
      } catch (deleteError) {
        console.error("Error deleting loading message:", deleteError);
      }

      await ctx.reply("❌ <b>Ошибка</b>\nНе удалось получить курсы валют", { parse_mode: "HTML" });
    }
  }
}
