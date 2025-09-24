import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { NBKRParserService } from "../services/NBKRParserService";
import { KeyboardService } from "../services/KeyboardService";

export class GoldCommand implements CommandHandler {
  private parserService: NBKRParserService;

  constructor(parserService: NBKRParserService) {
    this.parserService = parserService;
  }

  register(bot: any): void {
    bot.command("gold", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const loadingMessage = await ctx.reply("⏳ Получаю актуальные цены на золото...");

    try {
      console.log("Fetching gold prices data...");

      const today = new Date();
      const formattedDate = today.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const prices = await this.parserService.getGoldPrices();

      let result = `🥇 <b>Цены золотых мерных слитков</b>\n📅 <i>${formattedDate}</i>\n\n`;
      result += `<b>Масса (г)    Покупка (сом)    Продажа (сом)</b>\n`;
      result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      prices.forEach((price) => {
        const formattedMass = price.mass.padEnd(8);
        const formattedBuy = price.buyPrice.padEnd(12);
        result += `<code>${formattedMass} ${formattedBuy} ${price.sellPrice}</code>\n`;
      });

      result += `\n<i>📊 Источник: Национальный банк КР</i>\n<i>🌐 nbkr.kg</i>`;

      // Добавляем интерактивные кнопки
      const keyboard = KeyboardService.getGoldMenu();

      await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id);
      await ctx.reply(result, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });

    } catch (error) {
      console.error("Gold prices error:", error);

      try {
        await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id);
      } catch (deleteError) {
        console.error("Error deleting loading message:", deleteError);
      }

      await ctx.reply("❌ <b>Ошибка</b>\nНе удалось получить цены на золото", { parse_mode: "HTML" });
    }
  }
}
