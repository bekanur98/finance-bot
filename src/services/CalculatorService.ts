import { NBKRParserService } from "./NBKRParserService";

export class CalculatorService {
  private parserService: NBKRParserService;

  constructor(parserService: NBKRParserService) {
    this.parserService = parserService;
  }

  async calculateCurrency(amount: number, fromCurrency: string, toCurrency: string = "KGS"): Promise<string> {
    try {
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
      const formattedAmount = amount.toFixed(4);
      const formattedResult = result.toFixed(4);

      const fromFlag = this.getCurrencyFlag(fromCurrency);
      const toFlag = this.getCurrencyFlag(toCurrency);

      let response = `💱 <b>Результат расчета</b>\n\n`;
      response += `${fromFlag} <b>${formattedAmount} ${fromCurrency}</b>  =  ${toFlag} <b>${formattedResult} ${toCurrency}</b>\n\n`;

      // Добавляем курс
      if (fromCurrency !== "KGS" && toCurrency === "KGS") {
        const rate = rateMap.get(fromCurrency)!;
        response += `📈 Курс: 1 ${fromCurrency} = ${rate.toFixed(4)} KGS\n`;
      } else if (fromCurrency === "KGS" && toCurrency !== "KGS") {
        const rate = rateMap.get(toCurrency)!;
        response += `📈 Курс: 1 ${toCurrency} = ${rate.toFixed(4)} KGS\n`;
      }

      response += `\n<i>📊 Данные НБКР на ${new Date().toLocaleDateString('ru-RU')}</i>`;

      return response;

    } catch (error) {
      console.error("Calculator error:", error);
      throw new Error("Не удалось выполнить расчет");
    }
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string = "KGS"): Promise<number> {
    try {
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

      // Вычисляем курс
      if (fromCurrency === "KGS") {
        const rate = rateMap.get(toCurrency)!;
        return 1 / rate;
      } else if (toCurrency === "KGS") {
        return rateMap.get(fromCurrency)!;
      } else {
        // Кросс-курс (через сомы)
        const fromRate = rateMap.get(fromCurrency)!;
        const toRate = rateMap.get(toCurrency)!;
        return fromRate / toRate;
      }

    } catch (error) {
      console.error("Get rate error:", error);
      throw new Error("Не удалось получить курс валюты");
    }
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

  isValidAmount(text: string): boolean {
    const num = parseFloat(text);
    return !isNaN(num) && num > 0 && num <= 1000000000; // Максимум 1 миллиард
  }
}
