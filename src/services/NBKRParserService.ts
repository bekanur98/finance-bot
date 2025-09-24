import axios from "axios";
import * as cheerio from "cheerio";

export interface CurrencyRate {
  currency: string;
  rate: string;
  flag: string;
}

export interface GoldPrice {
  mass: string;
  buyPrice: string;
  sellPrice: string;
}

export class NBKRParserService {
  private readonly baseUrl = "https://www.nbkr.kg";

  async getCurrencyRates(): Promise<CurrencyRate[]> {
    const rates: CurrencyRate[] = [];

    try {
      // Получаем основные валюты с главной страницы
      const mainResponse = await axios.get(`${this.baseUrl}/index.jsp?lang=RUS`);
      const $main = cheerio.load(mainResponse.data);

      $main("table.table-striped").eq(1).find("tr").each((_: number, el: any) => {
        const tds = $main(el).find("td");
        if (tds.length >= 3) { // Проверяем что есть минимум 3 td (валюта, старый курс, новый курс)
          const currency = $main(tds[0]).text().trim();
          const rate = $main(tds[2]).text().trim(); // Берем третий td (индекс 2) - актуальный курс

          if (currency.includes("USD")) {
            rates.push({ currency: "USD", rate, flag: "🇺🇸" });
          } else if (currency.includes("EUR")) {
            rates.push({ currency: "EUR", rate, flag: "🇪🇺" });
          } else if (currency.includes("RUB")) {
            rates.push({ currency: "RUB", rate, flag: "🇷🇺" });
          } else if (currency.includes("KZT")) {
            rates.push({ currency: "KZT", rate, flag: "🇰🇿" });
          } else if (currency.includes("CNY")) {
            rates.push({ currency: "CNY", rate, flag: "🇨🇳" });
          }
        }
      });

      // Получаем турецкую лиру с отдельной страницы
      await this.getTurkishLiraRate(rates);

    } catch (error) {
      console.error("Error fetching currency rates:", error);
      throw new Error("Не удалось получить курсы валют");
    }

    return rates;
  }

  private async getTurkishLiraRate(rates: CurrencyRate[]): Promise<void> {
    try {
      const liraResponse = await axios.get(`${this.baseUrl}/index1.jsp?item=1562&lang=RUS`);
      const $lira = cheerio.load(liraResponse.data);

      $lira("table tr").each((_: number, row: any) => {
        const rowText = $lira(row).text().toLowerCase();
        if (rowText.includes("лира") || rowText.includes("try")) {
          const cells = $lira(row).find("td, th");
          cells.each((_: number, cell: any) => {
            const cellText = $lira(cell).text().trim();
            if (/^\d+[.,]\d+$/.test(cellText)) {
              if (!rates.some(r => r.currency === "TRY")) {
                rates.push({ currency: "TRY", rate: cellText, flag: "🇹🇷" });
                return false;
              }
            }
          });
        }
      });
    } catch (error) {
      console.error("Error fetching TRY currency:", error);
    }
  }

  async getGoldPrices(): Promise<GoldPrice[]> {
    const prices: GoldPrice[] = [];
    const goldUrls = [
      `${this.baseUrl}/index.jsp?lang=RUS`,
      `${this.baseUrl}/index1.jsp?item=1563&lang=RUS`,
      `${this.baseUrl}/index1.jsp?item=1564&lang=RUS`
    ];

    for (const url of goldUrls) {
      try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        $("table").each((_: number, table: any) => {
          const tableText = $(table).text().toLowerCase();

          if (tableText.includes("золот") || tableText.includes("слиток") ||
              tableText.includes("масса") || tableText.includes("покупка") ||
              tableText.includes("продажа")) {

            $(table).find("tr").each((_: number, row: any) => {
              const cells = $(row).find("td");
              if (cells.length >= 3) {
                const mass = $(cells[0]).text().trim();
                const buyPrice = $(cells[1]).text().trim();
                const sellPrice = $(cells[2]).text().trim();

                if (/\d/.test(mass) && /\d/.test(buyPrice) && /\d/.test(sellPrice)) {
                  prices.push({ mass, buyPrice, sellPrice });
                }
              }
            });
          }
        });

        if (prices.length > 0) break;

      } catch (error) {
        console.error(`Error fetching from ${url}:`, error);
      }
    }

    if (prices.length === 0) {
      throw new Error("Не удалось получить данные о ценах на золото");
    }

    return prices;
  }
}
