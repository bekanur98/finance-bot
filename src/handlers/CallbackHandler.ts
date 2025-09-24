import type { CallbackQueryContext } from "grammy";
import { KeyboardService } from "../services/KeyboardService";
import { NBKRParserService } from "../services/NBKRParserService";
import { SubscriberService } from "../services/SubscriberService";
import { GroupService } from "../services/GroupService";
import { StateManager } from "../services/StateManager";
import { CalculatorService } from "../services/CalculatorService";
import { InlineKeyboard } from "grammy";
import { AlertService } from "../services/AlertService";
import { StockService } from "../services/StockService";
import { FavoriteStockService } from "../services/FavoriteStockService";

export class CallbackHandler {
  private parserService: NBKRParserService;
  private subscriberService: SubscriberService;
  private groupService: GroupService;
  private stateManager: StateManager;
  private calculatorService: CalculatorService;
  private alertService: AlertService;
  private stockService: StockService;
  private favoriteStockService: FavoriteStockService;

  constructor(
    parserService: NBKRParserService,
    subscriberService: SubscriberService,
    groupService: GroupService,
    stateManager: StateManager,
    calculatorService: CalculatorService,
    alertService: AlertService,
    stockService: StockService,
    favoriteStockService: FavoriteStockService
  ) {
    this.parserService = parserService;
    this.subscriberService = subscriberService;
    this.groupService = groupService;
    this.stateManager = stateManager;
    this.calculatorService = calculatorService;
    this.alertService = alertService;
    this.stockService = stockService;
    this.favoriteStockService = favoriteStockService;
  }

  async handleCallback(ctx: CallbackQueryContext): Promise<void> {
    const data = ctx.callbackQuery.data;

    if (!data) return;

    try {
      // Отвечаем на callback query чтобы убрать "loading"
      await ctx.answerCallbackQuery();

        console.warn(data);

      switch (data) {
        case "main_menu":
          await this.showMainMenu(ctx);
          break;

        case "exchange":
          await this.showExchange(ctx);
          break;

        case "gold":
          await this.showGold(ctx);
          break;

        case "calc_menu":
          await this.showCalcMenu(ctx);
          break;

        case "alert_menu":
          await this.showAlertMenu(ctx);
          break;

        case "stats":
          await this.showStats(ctx);
          break;

        case "settings":
          await this.showSettings(ctx);
          break;

        case "help":
          await this.showHelp(ctx);
          break;

        // Калькулятор валют
        case "calc_usd":
        case "calc_eur":
        case "calc_rub":
        case "calc_kzt":
        case "calc_cny":
        case "calc_try":
          await this.showCurrencyCalc(ctx, data.split("_")[1].toUpperCase());
          break;

        // Алерты
        case "alert_add":
          await this.showAddAlert(ctx);
          break;

        case "alert_list":
          await this.showAlertList(ctx);
          break;

        // Подписка
        case "subscribe":
          await this.handleSubscribe(ctx);
          break;

        case "unsubscribe":
          await this.handleUnsubscribe(ctx);
          break;

        // Обновления данных
        case "exchange_refresh":
          await this.refreshExchange(ctx);
          break;

        case "gold_refresh":
          await this.refreshGold(ctx);
          break;

        // Быстрые кнопки для калькулятора
        case "quick_100":
        case "quick_500":
        case "quick_1000":
        case "quick_5000":
        case "quick_10000":
        case "quick_50000":
          await this.handleQuickAmount(ctx, data.split("_")[1]);
          break;

        case "calc_cancel":
          await this.handleCalcCancel(ctx);
          break;

        // Быстрые кнопки для процентов алерта
        case "alert_percent_1":
        case "alert_percent_2":
        case "alert_percent_5":
          await this.handleQuickPercent(ctx, data.split("_")[2]);
          break;

        // Удаление алертов
        case "alert_remove":
          await this.showRemoveAlertMenu(ctx);
          break;

        // Акции США
        case "stocks":
          await this.showStocks(ctx);
          break;

        case "stocks_top":
          await this.showTopStocks(ctx);
          break;

        case "stocks_favorites":
          await this.showFavoriteStocks(ctx);
          break;

        case "stocks_search":
          await this.showStockSearch(ctx);
          break;

        case "stocks_refresh":
          await this.refreshStocks(ctx);
          break;

        default:
          if (data.startsWith("currency_")) {
            const currency = data.split("_")[1];
            await this.selectCurrency(ctx, currency);
          } else if (data.startsWith("confirm_")) {
            const action = data.split("_")[1];
            await this.handleConfirmation(ctx, action);
          } else if (data.startsWith("cancel_")) {
            await this.handleCancel(ctx);
          } else if (data.startsWith("remove_alert_")) {
            const alertId = parseInt(data.split("_")[2]);
            await this.handleRemoveAlert(ctx, alertId);
          }
          break;
      }
    } catch (error) {
      console.error("Callback error:", error);
      await ctx.answerCallbackQuery("❌ Произошла ошибка");
    }
  }

  private async showMainMenu(ctx: CallbackQueryContext): Promise<void> {
    const keyboard = KeyboardService.getMainMenu();

    await ctx.editMessageText(
      "🏠 <b>Главное меню</b>\n\n" +
      "Выберите нужную функцию:",
      {
        parse_mode: "HTML",
        reply_markup: keyboard
      }
    );
  }

  private async showExchange(ctx: CallbackQueryContext): Promise<void> {
    // Показываем loading
    await ctx.editMessageText("⏳ Получаю актуальные курсы валют...");

    try {
      const rates = await this.parserService.getCurrencyRates();
      const today = new Date();
      const formattedDate = today.toLocaleDateString('ru-RU');

      let result = `💰 <b>Курсы валют НБКР</b>\n📅 <i>${formattedDate}</i>\n\n`;

      rates.forEach(rate => {
        result += `${rate.flag} <b>${rate.currency}</b>  ➤  <code>${rate.rate}</code> сом\n`;
      });

      result += `\n<i>📊 Источник: Национальный банк КР</i>`;

      const keyboard = KeyboardService.getQuickExchangeMenu();

      await ctx.editMessageText(result, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });

    } catch (error) {
      await ctx.editMessageText(
        "❌ <b>Ошибка</b>\nНе удалось получить курсы валют",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getMainMenu()
        }
      );
    }
  }

  private async showGold(ctx: CallbackQueryContext): Promise<void> {
    await ctx.editMessageText("⏳ Получаю актуальные цены на золото...");

    try {
      const prices = await this.parserService.getGoldPrices();
      const today = new Date();
      const formattedDate = today.toLocaleDateString('ru-RU');

      let result = `🥇 <b>Цены золотых мерных слитков</b>\n📅 <i>${formattedDate}</i>\n\n`;
      result += `<b>Масса (г)    Покупка (сом)    Продажа (сом)</b>\n`;
      result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      prices.forEach(price => {
        const formattedMass = price.mass.padEnd(8);
        const formattedBuy = price.buyPrice.padEnd(12);
        result += `<code>${formattedMass} ${formattedBuy} ${price.sellPrice}</code>\n`;
      });

      result += `\n<i>📊 Источник: Национальный банк КР</i>`;

      const keyboard = KeyboardService.getGoldMenu();

      await ctx.editMessageText(result, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });

    } catch (error) {
      await ctx.editMessageText(
        "❌ <b>Ошибка</b>\nНе удалось получить цены на золото",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getMainMenu()
        }
      );
    }
  }

  private async showCalcMenu(ctx: CallbackQueryContext): Promise<void> {
    const keyboard = KeyboardService.getCalcMenu();

    await ctx.editMessageText(
      "🧮 <b>Валютный калькулятор</b>\n\n" +
      "Выберите валюту для конвертации:",
      {
        parse_mode: "HTML",
        reply_markup: keyboard
      }
    );
  }

  private async showCurrencyCalc(ctx: CallbackQueryContext, currency: string): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Устанавливаем состояние для ввода суммы
    this.stateManager.setState(userId, 'calc_input', { currency });

    // Обновляем сообщение с inline-клавиатурой вместо обычной
    await ctx.editMessageText(
      `💱 <b>Калькулятор ${currency} → KGS</b>\n\n` +
      "💬 <b>Введите сумму</b> (например: 100) или нажмите кнопку ниже\n\n" +
      `Пример: если напишете <code>100</code>, получите результат в сомах`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("100", "quick_100")
          .text("500", "quick_500")
          .text("1000", "quick_1000").row()
          .text("5000", "quick_5000")
          .text("10000", "quick_10000")
          .text("50000", "quick_50000").row()
          .text("❌ Отмена", "calc_cancel")
          .text("🏠 Главное меню", "main_menu")
      }
    );
  }

  private async showAlertMenu(ctx: CallbackQueryContext): Promise<void> {
    const keyboard = KeyboardService.getAlertMenu();

    await ctx.editMessageText(
      "🔔 <b>Управление алертами</b>\n\n" +
      "Настройте уведомления о изменениях курса:",
      {
        parse_mode: "HTML",
        reply_markup: keyboard
      }
    );
  }

  private async showStats(ctx: CallbackQueryContext): Promise<void> {
    const userStats = this.subscriberService.getStats();
    const groupCount = this.groupService.getGroupSubscriberCount();

    const message = `
📊 <b>Статистика бота</b>

👤 <b>Индивидуальные подписчики:</b>
├ Активные: <code>${userStats.activeSubscribers}</code>
├ Неактивные: <code>${userStats.inactiveSubscribers}</code>
└ Всего: <code>${userStats.totalSubscribers}</code>

🏢 <b>Зарегистрированные группы:</b>
└ Активные: <code>${groupCount}</code>

📈 <b>Общая аудитория рассылки:</b>
└ <code>${userStats.activeSubscribers + groupCount}</code> получателей

📅 <i>Обновлено: ${new Date().toLocaleString('ru-RU')}</i>
    `.trim();

    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: KeyboardService.getMainMenu()
    });
  }

  private async showSettings(ctx: CallbackQueryContext): Promise<void> {
    const keyboard = KeyboardService.getSettingsMenu();

    await ctx.editMessageText(
      "⚙️ <b>Настройки</b>\n\n" +
      "Персонализируйте работу бота:",
      {
        parse_mode: "HTML",
        reply_markup: keyboard
      }
    );
  }

  private async showHelp(ctx: CallbackQueryContext): Promise<void> {
    const helpMessage = `
🤖 <b>Помощь - Финансовый бот НБКР</b>

📊 <b>ОСНОВНЫЕ КОМАНДЫ:</b>
/exchange - Актуальные курсы валют
/gold - Цены на золотые слитки
/calc 100 USD - Валютный калькулятор
/help - Эта справка

🔔 <b>ПОДПИСКА:</b>
/subscribe - Подписаться на рассылку (09:05)
/unsubscribe - Отписаться от рассылки
/status - Статус подписки

💡 <b>ПРИМЕРЫ КАЛЬКУЛЯТОРА:</b>
• /calc 100 USD - в сомы
• /calc 5000 KGS to USD - в доллары
• /calc 50 EUR to USD - кросс-курс

🌐 <b>Данные:</b> Национальный банк КР (nbkr.kg)
⏰ <b>Рассылка:</b> Ежедневно в 09:05
    `.trim();

    await ctx.editMessageText(helpMessage, {
      parse_mode: "HTML",
      reply_markup: KeyboardService.getMainMenu()
    });
  }

  private async handleSubscribe(ctx: CallbackQueryContext): Promise<void> {
    // Логика подписки (будет реализована позже)
    await ctx.editMessageText(
      "✅ <b>Подписка оформлена!</b>\n\n" +
      "Теперь вы будете получать ежедневные сообщения в 09:05",
      {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getMainMenu()
      }
    );
  }

  private async handleUnsubscribe(ctx: CallbackQueryContext): Promise<void> {
    // Логика отписки (будет реализована позже)
    await ctx.editMessageText(
      "👋 <b>Вы успешно отписались</b>\n\n" +
      "Больше не будете получать ежедневные сообщения",
      {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getMainMenu()
      }
    );
  }

  private async refreshExchange(ctx: CallbackQueryContext): Promise<void> {
    await ctx.answerCallbackQuery({ text: "🔄 Обновляю курсы...", show_alert: false });
    await this.showExchange(ctx);
  }

  private async refreshGold(ctx: CallbackQueryContext): Promise<void> {
    await ctx.answerCallbackQuery({ text: "🔄 Обновляю цены на золото...", show_alert: false });
    await this.showGold(ctx);
  }

  private async selectCurrency(ctx: CallbackQueryContext, currency: string): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Устанавливаем состояние для ввода процента алерта
    this.stateManager.setState(userId, 'alert_input', { currency });

    await ctx.editMessageText(
      `💱 <b>Выбрана валюта: ${currency}</b>\n\n` +
      "📊 Теперь введите процент для алерта (например: 2%)\n\n" +
      "💡 Бот уведомит вас, когда курс изменится на указанный процент",
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("1%", "alert_percent_1")
          .text("2%", "alert_percent_2")
          .text("5%", "alert_percent_5").row()
          .text("❌ Отмена", "main_menu")
      }
    );
  }

  private async handleConfirmation(ctx: CallbackQueryContext, action: string): Promise<void> {
    await ctx.editMessageText(
      `✅ <b>Действие подтверждено</b>\n\n` +
      `Выполняю: ${action}`,
      {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getMainMenu()
      }
    );
  }

  private async handleCancel(ctx: CallbackQueryContext): Promise<void> {
    await ctx.editMessageText(
      "❌ <b>Действие отменено</b>",
      {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getMainMenu()
      }
    );
  }

  private async showAddAlert(ctx: CallbackQueryContext): Promise<void> {
    const keyboard = KeyboardService.getCurrencyMenu();

    await ctx.editMessageText(
      "🔔 <b>Добавить алерт</b>\n\n" +
      "Выберите валюту для отслеживания:",
      {
        parse_mode: "HTML",
        reply_markup: keyboard
      }
    );
  }

  private async showAlertList(ctx: CallbackQueryContext): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const userAlerts = this.alertService.getUserAlerts(userId);

    if (userAlerts.length === 0) {
      await ctx.editMessageText(
        "📋 <b>Ваши алерты</b>\n\n" +
        "❌ У вас пока нет активных алертов\n\n" +
        "💡 Нажмите \"Добавить алерт\" чтобы настроить уведомления о изменениях курса",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getAlertMenu()
        }
      );
    } else {
      let message = "📋 <b>Ваши активные алерты:</b>\n\n";

      userAlerts.forEach((alert, index) => {
        const currencyFlag = this.getCurrencyFlag(alert.currency);
        message += `${index + 1}. ${currencyFlag} <b>${alert.currency}</b> - <code>${alert.percentage}%</code>\n`;
        message += `   📅 Создан: ${alert.createdAt.toLocaleDateString('ru-RU')}\n\n`;
      });

      message += `🔔 <i>Всего алертов: ${userAlerts.length}</i>`;

      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getAlertMenu()
      });
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

  private async handleQuickAmount(ctx: CallbackQueryContext, amount: string): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Получаем валюту из состояния
    const state = this.stateManager.getState(userId);
    const currency = state?.currency;

    if (!currency) {
      await ctx.answerCallbackQuery("❌ Сначала выберите валюту для конвертации");
      return;
    }

    try {
      // Используем calculatorService для расчета
      const result = await this.calculatorService.calculateCurrency(parseFloat(amount), currency, "KGS");

      await ctx.editMessageText(result, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("🔄 Еще раз", `calc_${currency.toLowerCase()}`)
          .text("🏠 Главное меню", "main_menu")
      });

      // Очищаем состояние после успешного расчета
      this.stateManager.clearState(userId);

    } catch (error) {
      console.error("Quick calc error:", error);
      await ctx.editMessageText(
        "❌ <b>Ошибка расчета</b>\n\n" +
        "Не удалось получить актуальные курсы валют. Попробуйте позже.",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getMainMenu()
        }
      );
      this.stateManager.clearState(userId);
    }
  }

  private async handleCalcCancel(ctx: CallbackQueryContext): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Сбрасываем состояние пользователя
    this.stateManager.resetState(userId);

    await ctx.editMessageText(
      "❌ <b>Калькулятор отменен</b>\n\n" +
      "Выберите новую валюту или вернитесь в главное меню",
      {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getMainMenu()
      }
    );
  }

  private async handleQuickPercent(ctx: CallbackQueryContext, percent: string): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Получаем валюту из состояния
    const state = this.stateManager.getState(userId);
    const currency = state?.currency;

    if (!currency) {
      await ctx.answerCallbackQuery("❌ Сначала выберите валюту для алерта");
      return;
    }

    const alertPercent = parseFloat(percent);

    if (isNaN(alertPercent)) {
      await ctx.answerCallbackQuery("❌ Некорректный процент");
      return;
    }

    // Сохраняем алерт в базе данных
    const success = this.alertService.addAlert(userId, currency, alertPercent);

    if (success) {
      await ctx.editMessageText(
        `✅ <b>Алерт создан!</b>\n\n` +
        `📊 Валюта: <b>${currency}</b>\n` +
        `📈 Процент изменения: <b>${alertPercent}%</b>\n\n` +
        `🔔 Вы получите уведомление, когда курс ${currency} изменится на ${alertPercent}% или больше`,
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getMainMenu()
        }
      );
    } else {
      await ctx.editMessageText(
        `⚠️ <b>Алерт уже существует</b>\n\n` +
        `У вас уже есть алерт для <b>${currency}</b> с процентом <b>${alertPercent}%</b>\n\n` +
        `Попробуйте создать алерт с другим процентом`,
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getMainMenu()
        }
      );
    }

    // Очищаем состояние после установки алерта
    this.stateManager.clearState(userId);
  }

  private async showRemoveAlertMenu(ctx: CallbackQueryContext): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const userAlerts = this.alertService.getUserAlerts(userId);

    if (userAlerts.length === 0) {
      await ctx.editMessageText(
        "📋 <b>Удаление алертов</b>\n\n" +
        "❌ У вас пока нет активных алертов для удаления",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getAlertMenu()
        }
      );
    } else {
      let message = "📋 <b>Выберите алерт для удаления:</b>\n\n";

      userAlerts.forEach((alert, index) => {
        const currencyFlag = this.getCurrencyFlag(alert.currency);
        message += `${index + 1}. ${currencyFlag} <b>${alert.currency}</b> - <code>${alert.percentage}%</code>\n`;
        message += `   📅 Создан: ${alert.createdAt.toLocaleDateString('ru-RU')}\n\n`;
      });

      message += `🔔 <i>Всего алертов: ${userAlerts.length}</i>\n\n`;
      message += `❌ Нажмите на кнопку с алертом который хотите удалить:`;

      // Создаем кнопки для каждого алерта
      const keyboard = new InlineKeyboard();

      userAlerts.forEach((alert, index) => {
        const currencyFlag = this.getCurrencyFlag(alert.currency);
        keyboard.text(
          `❌ ${currencyFlag} ${alert.currency} ${alert.percentage}%`,
          `remove_alert_${alert.id}`
        ).row();
      });

      keyboard.text("🔙 Назад к алертам", "alert_menu")
        .text("🏠 Главное меню", "main_menu");

      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    }
  }

  private async handleRemoveAlert(ctx: CallbackQueryContext, alertId: number): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Получаем информацию об алерте перед удалением
    const userAlerts = this.alertService.getUserAlerts(userId);
    const alertToRemove = userAlerts.find(alert => alert.id === alertId);

    if (!alertToRemove) {
      await ctx.answerCallbackQuery("❌ Алерт не найден");
      return;
    }

    // Удаляем алерт по ID
    const success = this.alertService.removeAlert(alertId, userId);

    if (success) {
      const currencyFlag = this.getCurrencyFlag(alertToRemove.currency);
      await ctx.editMessageText(
        `✅ <b>Алерт удален!</b>\n\n` +
        `${currencyFlag} <b>${alertToRemove.currency}</b> - <code>${alertToRemove.percentage}%</code>\n\n` +
        `Вы больше не будете получать уведомления об изменениях курса ${alertToRemove.currency} на ${alertToRemove.percentage}%`,
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard()
            .text("📋 Мои алерты", "alert_list")
            .text("🏠 Главное меню", "main_menu")
        }
      );
    } else {
      await ctx.editMessageText(
        `❌ <b>Ошибка удаления</b>\n\n` +
        `Не удалось удалить алерт. Возможно, он уже был удален.`,
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getAlertMenu()
        }
      );
    }
  }

  private async showStocks(ctx: CallbackQueryContext): Promise<void> {
    await ctx.editMessageText("⏳ Получаю данные о топ-10 акций США...");

    try {
      const topStocks = await this.stockService.getTopStocks();

      if (topStocks.length === 0) {
        await ctx.editMessageText(
          "❌ <b>Ошибка</b>\nНе удалось получить данные об акциях\n\n" +
          "💡 Возможно, превышен лимит API запросов",
          {
            parse_mode: "HTML",
            reply_markup: KeyboardService.getMainMenu()
          }
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
        message += `└ ${change}\n\n`;
      });

      message += `💡 <b>Поиск:</b> <code>/stocks AAPL</code>\n`;
      message += `📊 <i>Данные: Alpha Vantage</i>`;

      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getStockMenu()
      });

    } catch (error) {
      console.error("Error showing stocks:", error);
      await ctx.editMessageText(
        "❌ <b>Ошибка</b>\nНе удалось получить данные об акциях",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getMainMenu()
        }
      );
    }
  }

  private async showTopStocks(ctx: CallbackQueryContext): Promise<void> {
    await this.showStocks(ctx); // Используем тот же метод
  }

  private async showFavoriteStocks(ctx: CallbackQueryContext): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const favorites = this.favoriteStockService.getUserFavorites(userId);

    if (favorites.length === 0) {
      await ctx.editMessageText(
        "⭐ <b>Избранные акции</b>\n\n" +
        "❌ У вас пока нет избранных акций\n\n" +
        "💡 Добавьте акции в избранное для быстрого доступа",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getFavoriteStocksMenu()
        }
      );
      return;
    }

    await ctx.editMessageText("⏳ Получаю данные о ваших избранных акциях...");

    try {
      let message = `⭐ <b>Ваши избранные акции</b>\n`;
      message += `📅 <i>${new Date().toLocaleDateString('ru-RU')}</i>\n\n`;

      for (const favorite of favorites) {
        const quote = await this.stockService.getStockQuote(favorite.symbol);
        if (quote) {
          const flag = this.stockService.getStockFlag(quote.symbol);
          const price = this.stockService.formatPrice(quote.price);
          const change = this.stockService.formatChange(quote.change, quote.changePercent);

          message += `${flag} <b>${quote.symbol}</b>\n`;
          message += `├ Цена: <code>${price}</code>\n`;
          message += `└ ${change}\n\n`;
        }
      }

      message += `⭐ <i>Всего избранных: ${favorites.length}</i>\n`;
      message += `📊 <i>Данные: Alpha Vantage</i>`;

      await ctx.editMessageText(message, {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getFavoriteStocksMenu()
      });

    } catch (error) {
      console.error("Error showing favorite stocks:", error);
      await ctx.editMessageText(
        "❌ <b>Ошибка</b>\nНе удалось получить данные об избранных акциях",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getFavoriteStocksMenu()
        }
      );
    }
  }

  private async showStockSearch(ctx: CallbackQueryContext): Promise<void> {
    await ctx.editMessageText(
      "🔍 <b>Поиск акций</b>\n\n" +
      "💬 Используйте команду для поиска:\n" +
      "<code>/stocks AAPL</code> - для поиска Apple\n" +
      "<code>/stocks Tesla</code> - для поиска по названию\n\n" +
      "💡 Или выберите популярные акции ниже:",
      {
        parse_mode: "HTML",
        reply_markup: KeyboardService.getPopularStocksMenu()
      }
    );
  }

  private async refreshStocks(ctx: CallbackQueryContext): Promise<void> {
    await ctx.answerCallbackQuery({ text: "🔄 Обновляю данные по акциям...", show_alert: false });
    await this.showStocks(ctx);
  }
}
