import { InlineKeyboard, Keyboard } from "grammy";

export class KeyboardService {

  // Главное меню с inline кнопками
  static getMainMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("💱 Курсы валют", "exchange")
      .text("🥇 Цены на золото", "gold").row()
      .text("📈 Акции США", "stocks")
      .text("🧮 Калькулятор", "calc_menu").row()
      .text("🔔 Алерты", "alert_menu")
      .text("📊 Статистика", "stats").row()
      .text("❓ Помощь", "help")
      .text("⚙️ Настройки", "settings");
  }

  // Меню калькулятора
  static getCalcMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("🇺🇸 USD → KGS", "calc_usd")
      .text("🇪🇺 EUR → KGS", "calc_eur").row()
      .text("🇷🇺 RUB → KGS", "calc_rub")
      .text("🇰🇿 KZT → KGS", "calc_kzt").row()
      .text("🇨🇳 CNY → KGS", "calc_cny")
      .text("🇹🇷 TRY → KGS", "calc_try").row()
      .text("🔄 Обратная конвертация", "calc_reverse").row()
      .text("🏠 Главное меню", "main_menu");
  }

  // Меню алертов
  static getAlertMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("➕ Добавить алерт", "alert_add")
      .text("📋 Мои алерты", "alert_list").row()
      .text("🗑️ Удалить алерт", "alert_remove")
      .text("⚙️ Настроить", "alert_settings").row()
      .text("🏠 Главное меню", "main_menu");
  }

  // Меню выбора валют для алертов
  static getCurrencyMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("🇺🇸 USD", "currency_USD")
      .text("🇪🇺 EUR", "currency_EUR")
      .text("🇷🇺 RUB", "currency_RUB").row()
      .text("🇰🇿 KZT", "currency_KZT")
      .text("🇨🇳 CNY", "currency_CNY")
      .text("🇹🇷 TRY", "currency_TRY").row()
      .text("🔙 Назад", "alert_menu");
  }

  // Меню подписки
  static getSubscriptionMenu(isSubscribed: boolean): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    if (isSubscribed) {
      keyboard
        .text("✅ Подписка активна", "subscription_status")
        .row()
        .text("❌ Отписаться", "unsubscribe")
        .text("⚙️ Настройки", "subscription_settings");
    } else {
      keyboard
        .text("🔔 Подписаться", "subscribe")
        .text("ℹ️ Информация", "subscription_info");
    }

    return keyboard.row().text("🏠 Главное меню", "main_menu");
  }

  // Меню настроек
  static getSettingsMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("🔔 Уведомления", "settings_notifications")
      .text("🌐 Язык", "settings_language").row()
      .text("📊 Формат данных", "settings_format")
      .text("⏰ Время рассылки", "settings_time").row()
      .text("🏠 Главное меню", "main_menu");
  }

  // Кнопки подтверждения
  static getConfirmationMenu(action: string): InlineKeyboard {
    return new InlineKeyboard()
      .text("✅ Да", `confirm_${action}`)
      .text("❌ Нет", `cancel_${action}`);
  }

  // Пагинация
  static getPaginationMenu(page: number, totalPages: number, prefix: string): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Навигация по страницам
    if (page > 1) {
      keyboard.text("⬅️", `${prefix}_page_${page - 1}`);
    }

    keyboard.text(`${page}/${totalPages}`, "current_page");

    if (page < totalPages) {
      keyboard.text("➡️", `${prefix}_page_${page + 1}`);
    }

    return keyboard.row().text("🏠 Главное меню", "main_menu");
  }

  // Постоянная клавиатура (снизу экрана)
  static getPersistentKeyboard(): Keyboard {
    return new Keyboard()
      .text("💱 Курсы").text("🥇 Золото").text("📈 Акции").row()
      .text("🧮 Калькулятор").text("📊 Статистика").row()
      .text("🔔 Подписка").text("❓ Помощь")
      .resized()
      .persistent();
  }

  // Клавиатура для ввода суммы
  static getAmountKeyboard(): Keyboard {
    return new Keyboard()
      .text("100").text("500").text("1000").row()
      .text("5000").text("10000").text("50000").row()
      .text("❌ Отмена")
      .resized()
      .oneTime();
  }

  // Быстрые действия для курсов валют
  static getQuickExchangeMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("🔄 Обновить", "exchange_refresh")
      .text("📊 Тренд", "exchange_trend").row()
      .text("📈 График", "exchange_chart")
      .text("💾 Сохранить", "exchange_save").row()
      .text("🏠 Главное меню", "main_menu");
  }

  // Меню для золота
  static getGoldMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("🔄 Обновить", "gold_refresh")
      .text("📊 История", "gold_history").row()
      .text("💰 Калькулятор", "gold_calc")
      .text("🔔 Алерт", "gold_alert").row()
      .text("🏠 Главное меню", "main_menu");
  }

  // Главное меню акций
  static getStockMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("🔥 Топ-10", "stocks_top")
      .text("🔍 Поиск", "stocks_search").row()
      .text("⭐ Избранные", "stocks_favorites")
      .text("🔄 Обновить", "stocks_refresh").row()
      .text("🏠 Главное меню", "main_menu");
  }

  // Меню для конкретной акции
  static getStockDetailsMenu(symbol: string): InlineKeyboard {
    return new InlineKeyboard()
      .text("🔄 Обновить", `stock_refresh_${symbol}`)
      .text("⭐ В избранное", `stock_favorite_${symbol}`).row()
      .text("🔔 Алерт", `stock_alert_${symbol}`)
      .text("📊 Детали", `stock_details_${symbol}`).row()
      .text("🔙 К акциям", "stocks")
      .text("🏠 Главное меню", "main_menu");
  }

  // Меню избранных акций
  static getFavoriteStocksMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("➕ Добавить", "stocks_add_favorite")
      .text("🗑️ Удалить", "stocks_remove_favorite").row()
      .text("🔄 Обновить все", "stocks_refresh_favorites")
      .text("📊 Сводка", "stocks_favorites_summary").row()
      .text("🔙 К акциям", "stocks")
      .text("🏠 Главное меню", "main_menu");
  }

  // Меню популярных акций для быстрого добавления
  static getPopularStocksMenu(): InlineKeyboard {
    return new InlineKeyboard()
      .text("🍎 AAPL", "add_favorite_AAPL")
      .text("⚡ TSLA", "add_favorite_TSLA")
      .text("🎮 NVDA", "add_favorite_NVDA").row()
      .text("💻 MSFT", "add_favorite_MSFT")
      .text("🔍 GOOGL", "add_favorite_GOOGL")
      .text("📦 AMZN", "add_favorite_AMZN").row()
      .text("👥 META", "add_favorite_META")
      .text("🔥 AMD", "add_favorite_AMD")
      .text("🎬 NFLX", "add_favorite_NFLX").row()
      .text("🔙 Назад", "stocks_favorites");
  }
}
