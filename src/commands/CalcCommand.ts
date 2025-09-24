import type { CommandContext } from "grammy";
import type { CommandHandler } from "../types";
import { NBKRParserService } from "../services/NBKRParserService";

export class CalcCommand implements CommandHandler {
  private parserService: NBKRParserService;

  constructor(parserService: NBKRParserService) {
    this.parserService = parserService;
  }

  register(bot: any): void {
    bot.command("calc", this.execute.bind(this));
    // Альтернативные команды
    bot.command("convert", this.execute.bind(this));
    bot.command("курс", this.execute.bind(this));
  }

  async execute(ctx: CommandContext<any>): Promise<void> {
    const args = ctx.match?.toString().trim();

    if (!args) {
      await ctx.reply(
        "💱 <b>Валютный калькулятор</b>\n\n" +
        "<b>Примеры использования:</b>\n" +
        "• <code>/calc 100 USD</code> - сколько сомов в 100 долларах\n" +
        "• <code>/calc 5000 KGS to USD</code> - конвертация в доллары\n" +
        "• <code>/calc 50 EUR to USD</code> - кросс-курс\n\n" +
        "<b>Поддерживаемые валюты:</b>\n" +
        "USD, EUR, RUB, KZT, CNY, TRY, KGS",
        { parse_mode: "HTML" }
      );
      return;
    }

    try {
      const result = await this.parseAndCalculate(args);
      await ctx.reply(result, { parse_mode: "HTML" });
    } catch (error) {
      console.error("Calc error:", error);
      await ctx.reply(
        "❌ <b>Ошибка</b>\n\n" +
        "Проверьте правильность запроса.\n" +
        "Пример: <code>/calc 100 USD</code>",
        { parse_mode: "HTML" }
      );
    }
  }

  private async parseAndCalculate(input: string): Promise<string> {
    // Парсинг входной строки: "100 USD to EUR" или "100 USD"
    const regex = /(\d+(?:\.\d+)?)\s*([A-Z]{3})(?:\s+to\s+([A-Z]{3}))?/i;
    const match = input.match(regex);

    if (!match) {
      throw new Error("Invalid format");
    }

    const amountStr = match[1];
    if (!amountStr) {
      throw new Error("Amount not found");
    }

    const amount = parseFloat(amountStr);
    const fromCurrency = match[2] ? match[2].toUpperCase() : "";
    const toCurrency = match[3] ? match[3].toUpperCase() : "KGS";

    if (!fromCurrency) {
      throw new Error("Currency not specified");
    }

    // Получаем актуальные курсы
    const rates = await this.parserService.getCurrencyRates();

    // Создаем карту курсов (все курсы к сому)
    const rateMap = new Map<string, number>();
    rateMap.set("KGS", 1); // Базовая валюта

    rates.forEach(rate => {
      const numericRate = parseFloat(rate.rate.replace(",", "."));
      if (!isNaN(numericRate)) {
        rateMap.set(rate.currency, numericRate);
      }
    });

    // Проверяем доступность валют
    if (!rateMap.has(fromCurrency)) {
      throw new Error(`Валюта ${fromCurrency} не поддерживается`);
    }
    if (!rateMap.has(toCurrency)) {
      throw new Error(`Валюта ${toCurrency} не поддерживается`);
    }

    // Вычисляем результат
    let result: number;

    if (fromCurrency === "KGS") {
      // Из сомов в другую валюту
      const rate = rateMap.get(toCurrency)!;
      result = amount / rate;
    } else if (toCurrency === "KGS") {
      // Из другой валюты в сомы
      const rate = rateMap.get(fromCurrency)!;
      result = amount * rate;
    } else {
      // Кросс-курс (через сомы)
      const fromRate = rateMap.get(fromCurrency)!;
      const toRate = rateMap.get(toCurrency)!;
      const inKgs = amount * fromRate;
      result = inKgs / toRate;
    }

    // Форматируем результат
    const formattedAmount = this.formatNumber(amount);
    const formattedResult = this.formatNumber(result);

    const fromFlag = this.getCurrencyFlag(fromCurrency);
    const toFlag = this.getCurrencyFlag(toCurrency);

    let response = `💱 <b>Конвертация валют</b>\n\n`;
    response += `${fromFlag} <b>${formattedAmount} ${fromCurrency}</b>  =  ${toFlag} <b>${formattedResult} ${toCurrency}</b>\n\n`;

    // Добавляем курс
    if (fromCurrency !== "KGS" && toCurrency === "KGS") {
      const rate = rateMap.get(fromCurrency)!;
      response += `📈 Курс: 1 ${fromCurrency} = ${this.formatNumber(rate)} KGS\n`;
    } else if (fromCurrency === "KGS" && toCurrency !== "KGS") {
      const rate = rateMap.get(toCurrency)!;
      response += `📈 Курс: 1 ${toCurrency} = ${this.formatNumber(rate)} KGS\n`;
    }

    response += `\n<i>📊 Данные НБКР на ${new Date().toLocaleDateString('ru-RU')}</i>`;

    return response;
  }

  private formatNumber(num: number): string {
    return num.toFixed(4);
  }

  private getCurrencyFlag(currency: string): string {
    const flags: Record<string, string> = {
      "USD": "🇺🇸",
      "EUR": "🇪🇺",
      "RUB": "🇷🇺",
      "KZT": "🇰🇿",
      "CNY": "🇨🇳",
      "TRY": "🇹🇷",
      "KGS": "🇰🇬"
    };
    return flags[currency] || "💱";
  }
}
