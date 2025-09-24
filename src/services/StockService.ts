import axios from "axios";

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
}

export class StockService {
  private readonly apiKey = "I9TMO3WUUX127K3N";
  private readonly baseUrl = "https://www.alphavantage.co/query";
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 минут кэш

  // Топ-10 популярных акций
  private readonly topStocks = [
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "MSFT", name: "Microsoft Corporation" },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "AMZN", name: "Amazon.com Inc." },
    { symbol: "TSLA", name: "Tesla Inc." },
    { symbol: "NVDA", name: "NVIDIA Corporation" },
    { symbol: "META", name: "Meta Platforms Inc." },
    { symbol: "AMD", name: "Advanced Micro Devices" },
    { symbol: "NFLX", name: "Netflix Inc." },
    { symbol: "CRM", name: "Salesforce Inc." }
  ];

  private isDataFresh(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && this.isDataFresh(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: "GLOBAL_QUOTE",
          symbol: symbol,
          apikey: this.apiKey
        }
      });

      const data = response.data["Global Quote"];

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      const quote: StockQuote = {
        symbol: data["01. symbol"],
        name: this.getStockName(symbol),
        price: parseFloat(data["05. price"]),
        change: parseFloat(data["09. change"]),
        changePercent: parseFloat(data["10. change percent"].replace("%", "")),
        volume: parseInt(data["06. volume"])
      };

      this.setCache(cacheKey, quote);
      return quote;

    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  async getTopStocks(): Promise<StockQuote[]> {
    const cacheKey = "top_stocks";
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const promises = this.topStocks.map(stock => this.getStockQuote(stock.symbol));
    const results = await Promise.allSettled(promises);

    const stocks = results
      .filter((result): result is PromiseFulfilledResult<StockQuote> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
      .slice(0, 10); // Топ-10

    this.setCache(cacheKey, stocks);
    return stocks;
  }

  async searchStock(query: string): Promise<StockSearchResult[]> {
    const cacheKey = `search_${query}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: "SYMBOL_SEARCH",
          keywords: query,
          apikey: this.apiKey
        }
      });

      const matches = response.data.bestMatches || [];
      const results: StockSearchResult[] = matches.slice(0, 10).map((match: any) => ({
        symbol: match["1. symbol"],
        name: match["2. name"],
        type: match["3. type"],
        region: match["4. region"],
        currency: match["8. currency"]
      }));

      this.setCache(cacheKey, results);
      return results;

    } catch (error) {
      console.error(`Error searching for ${query}:`, error);
      return [];
    }
  }

  private getStockName(symbol: string): string {
    const found = this.topStocks.find(stock => stock.symbol === symbol);
    return found ? found.name : symbol;
  }

  getStockFlag(symbol: string): string {
    // Большинство акций американские, но можно расширить
    const flags: Record<string, string> = {
      "AAPL": "🍎",
      "TSLA": "⚡",
      "NVDA": "🎮",
      "MSFT": "💻",
      "GOOGL": "🔍",
      "AMZN": "📦",
      "META": "👥",
      "AMD": "🔥",
      "NFLX": "🎬",
      "CRM": "☁️"
    };
    return flags[symbol] || "📈";
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  formatChange(change: number, changePercent: number): string {
    const sign = change >= 0 ? "+" : "";
    const emoji = change >= 0 ? "📈" : "📉";
    return `${emoji} ${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  }

  // Проверка лимитов API (примерная)
  getRemainingApiCalls(): number {
    // Alpha Vantage: 25 calls per day for free tier
    // Здесь можно реализовать более точный подсчет
    return 25 - this.cache.size;
  }
}
