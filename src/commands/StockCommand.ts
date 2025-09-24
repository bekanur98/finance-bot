import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { StockService } from "../services/StockService";
import { KeyboardService } from "../services/KeyboardService";

export class StockCommand implements CommandHandler {
  private stockService: StockService;

  constructor(stockService: StockService) {
    this.stockService = stockService;
  }

  register(bot: any): void {
    bot.command("stocks", this.execute.bind(this));
    bot.command("акции", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const args = ctx.match?.toString().trim();

    if (!args) {
      // Показываем топ-10 акций
      await this.showTopStocks(ctx);
    } else {
      // Поиск конкретной акции
      await this.searchStock(ctx, args);
    }
  }

  private async showTopStocks(ctx: CommandContext<any>): Promise<void> {
    const loadingMessage = await ctx.reply("⏳ Получаю данные о топ-10 акций США...");

    try {
      const topStocks = await this.stockService.getTopStocks();

      if (topStocks.length === 0) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          loadingMessage.message_id,
          "❌ <b>Ошибка</b>\nНе удалось получить данные об акциях",
          { parse_mode: "HTML" }
        );
        return;
      }

      let message = `📈 <b>Топ-10 акций США</b>\n`;
      message += `📅 <i>${new Date().toLocaleDateString('ru-RU')}</i>\n\n`;

      topStocks.forEach((stock, index) => {
        const flag = this.stockService.getStockFlag(stock.symbol);
        const price = this.stockService.formatPrice(stock.price);
        const change = this.stockService.formatChange(stock.change, stock.changePercent);

        message += `${index + 1}. ${flag} <b>${stock.symbol}</b>\n`;
        message += `├ Цена: <code>${price}</code>\n`;
        message += `└ Изменение: ${change}\n\n`;
      });

      message += `💡 <b>Поиск акций:</b> <code>/stocks AAPL</code>\n`;
      message += `📊 <i>Данные: Alpha Vantage</i>`;

      await ctx.api.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        message,
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getStockMenu()
        }
      );

    } catch (error) {
      console.error("Error showing top stocks:", error);
      await ctx.api.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        "❌ <b>Ошибка</b>\nНе удалось получить данные об акциях",
        { parse_mode: "HTML" }
      );
    }
  }

  private async searchStock(ctx: CommandContext<any>, query: string): Promise<void> {
    const loadingMessage = await ctx.reply(`⏳ Поиск акций: "${query}"...`);

    try {
      // Сначала попробуем получить точную котировку если это тикер
      if (query.length <= 5 && /^[A-Z]+$/i.test(query)) {
        const quote = await this.stockService.getStockQuote(query.toUpperCase());
        if (quote) {
          await this.showStockQuote(ctx, loadingMessage.message_id, quote);
          return;
        }
      }

      // Если не нашли точное совпадение, ищем через поиск
      const searchResults = await this.stockService.searchStock(query);

      if (searchResults.length === 0) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          loadingMessage.message_id,
          `❌ <b>Не найдено</b>\n\nПо запросу "${query}" ничего не найдено.\n\n💡 Попробуйте другой тикер или название компании.`,
          { parse_mode: "HTML" }
        );
        return;
      }

      let message = `🔍 <b>Результаты поиска: "${query}"</b>\n\n`;

      searchResults.slice(0, 5).forEach((result, index) => {
        message += `${index + 1}. <b>${result.symbol}</b>\n`;
        message += `├ ${result.name}\n`;
        message += `├ Тип: ${result.type}\n`;
        message += `└ Регион: ${result.region}\n\n`;
      });

      if (searchResults[0]) {
        message += `💡 <b>Получить котировку:</b> <code>/stocks ${searchResults[0].symbol}</code>`;
      }

      await ctx.api.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        message,
        { parse_mode: "HTML" }
      );

    } catch (error) {
      console.error("Error searching stock:", error);
      await ctx.api.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        "❌ <b>Ошибка поиска</b>\nПопробуйте позже",
        { parse_mode: "HTML" }
      );
    }
  }

  private async showStockQuote(ctx: CommandContext<any>, messageId: number, quote: any): Promise<void> {
    const flag = this.stockService.getStockFlag(quote.symbol);
    const price = this.stockService.formatPrice(quote.price);
    const change = this.stockService.formatChange(quote.change, quote.changePercent);

    let message = `${flag} <b>${quote.symbol}</b>\n`;
    message += `📊 ${quote.name}\n\n`;
    message += `💰 <b>Цена:</b> <code>${price}</code>\n`;
    message += `📈 <b>Изменение:</b> ${change}\n`;
    message += `📊 <b>Объем:</b> <code>${quote.volume.toLocaleString()}</code>\n\n`;
    message += `⏰ <i>${new Date().toLocaleString('ru-RU')}</i>\n`;
    message += `📊 <i>Данные: Alpha Vantage</i>`;

    await ctx.api.editMessageText(
      ctx.chat.id,
      messageId,
      message,
      {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getStockDetailsMenu(quote.symbol)
      }
    );
  }
}
