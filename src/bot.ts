import { Bot } from "grammy";
import { DatabaseService } from "./services/DatabaseService";
import { SubscriberService } from "./services/SubscriberService";
import { GroupService } from "./services/GroupService";
import { NBKRParserService } from "./services/NBKRParserService";
import { SchedulerService } from "./services/SchedulerService";
import { StateManager } from "./services/StateManager";
import { CalculatorService } from "./services/CalculatorService";
import { CallbackHandler } from "./handlers/CallbackHandler";
import { StartCommand } from "./commands/StartCommand";
import { ExchangeCommand } from "./commands/ExchangeCommand";
import { GoldCommand } from "./commands/GoldCommand";
import { SubscribeCommand } from "./commands/SubscribeCommand";
import { UnsubscribeCommand } from "./commands/UnsubscribeCommand";
import { StatusCommand } from "./commands/StatusCommand";
import { StatsCommand } from "./commands/StatsCommand";
import { RegisterGroupCommand } from "./commands/RegisterGroupCommand";
import { UnregisterGroupCommand } from "./commands/UnregisterGroupCommand";
import { CalcCommand } from "./commands/CalcCommand";
import { HelpCommand } from "./commands/HelpCommand";
import { AlertCommand } from "./commands/AlertCommand";
import { KeyboardService } from "./services/KeyboardService";
import { AlertService } from "./services/AlertService";
import { AlertMonitorService } from "./services/AlertMonitorService";
import { TestAlertCommand } from "./commands/TestAlertCommand";
import { StockService } from "./services/StockService";
import { FavoriteStockService } from "./services/FavoriteStockService";
import { StockCommand } from "./commands/StockCommand";
import { WebAdminService } from "./services/WebAdminService";

// Create an instance of the `Bot` class and pass your bot token to it.
const bot = new Bot("985756606:AAEVuaQzTeDDo8ZVw4uygdXp8TfVYHPQfVQ");
// const bot = new Bot("6793417861:AAFa3WG9ONHCkzLZ7oWGXW4cPdafMzBISmo");

console.warn("Bot is starting...");

// Initialize database and services
const dbService = new DatabaseService();
const subscriberService = new SubscriberService(dbService);
const groupService = new GroupService(dbService);
const parserService = new NBKRParserService();
const alertService = new AlertService(dbService);
const stockService = new StockService();
const favoriteStockService = new FavoriteStockService(dbService);
const alertMonitorService = new AlertMonitorService(alertService, parserService, dbService, bot);
const stateManager = new StateManager();
const calculatorService = new CalculatorService(parserService);
const schedulerService = new SchedulerService(subscriberService, groupService, parserService, bot);

// Initialize web admin interface
const webAdminService = new WebAdminService(dbService);

// Initialize callback handler
const callbackHandler = new CallbackHandler(parserService, subscriberService, groupService, stateManager, calculatorService, alertService, stockService, favoriteStockService);

// Initialize commands
const commands = [
  new StartCommand(),
  new HelpCommand(),
  new ExchangeCommand(parserService),
  new GoldCommand(parserService),
  new StockCommand(stockService),
  new CalcCommand(parserService),
  new AlertCommand(alertService),
  new TestAlertCommand(alertMonitorService),
  new SubscribeCommand(subscriberService),
  new UnsubscribeCommand(subscriberService),
  new StatusCommand(subscriberService),
  new StatsCommand(subscriberService, groupService),
  new RegisterGroupCommand(groupService),
  new UnregisterGroupCommand(groupService)
];

// Register all commands
commands.forEach(command => {
  command.register(bot);
});

// Handle callback queries (inline button presses)
bot.on("callback_query", async (ctx) => {
  await callbackHandler.handleCallback(ctx as any);
});

// Handle messages from persistent keyboard
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.from?.id;

  // Игнорируем команды, они обрабатываются отдельно
  if (text.startsWith('/')) return;

  // Проверяем, находится ли пользователь в режиме ввода для калькулятора
  if (userId) {
    const userState = stateManager.getState(userId);

    if (userState && userState.action === 'calc_input') {
      // Пользо��атель вводит сумму для калькулятора
      if (calculatorService.isValidAmount(text)) {
        const amount = parseFloat(text);
        const currency = userState.currency!;

        try {
          const result = await calculatorService.calculateCurrency(amount, currency, "KGS");

          await ctx.reply(result, {
            parse_mode: "HTML",
            reply_markup: KeyboardService.getMainMenu()
          });

          // Очи��аем состояние после успешного расчета
          stateManager.clearState(userId);
          return;

        } catch (error) {
          await ctx.reply(
            "❌ <b>Ошибка расчета</b>\n\n" +
            "Не удалось получить актуальные курсы валют. Попробуйте позже.",
            {
              parse_mode: "HTML",
              reply_markup: KeyboardService.getMainMenu()
            }
          );
          stateManager.clearState(userId);
          return;
        }
      } else {
        // Неверный формат числа
        await ctx.reply(
          "❌ <b>Неверная сумма</b>\n\n" +
          "Введите корректное число от 0.01 до 1,000,000,000\n" +
          "Например: <code>100</code> ��ли <code>50.5</code>",
          {
            parse_mode: "HTML",
            reply_markup: KeyboardService.getAmountKeyboard()
          }
        );
        return;
      }
    } else if (userState && userState.action === 'alert_input') {
      // Пол��зователь вводит процент для алерта
      const percentMatch = text.match(/^(\d+(?:\.\d+)?)%?$/);
      if (percentMatch && percentMatch[1]) {
        const percent = parseFloat(percentMatch[1]);
        const currency = userState.currency!;

        if (percent > 0 && percent <= 100) {
          // Сохраняем алерт в базе данных
          const success = alertService.addAlert(userId, currency, percent);

          if (success) {
            await ctx.reply(
              `✅ <b>Алерт создан!</b>\n\n` +
              `📊 Валюта: <b>${currency}</b>\n` +
              `📈 Процент изменения: <b>${percent}%</b>\n\n` +
              `🔔 Вы получите уведомление, когда курс ${currency} изменится на ${percent}% или больше`,
              {
                parse_mode: "HTML",
                reply_markup: KeyboardService.getMainMenu()
              }
            );
          } else {
            await ctx.reply(
              `⚠️ <b>Алерт уже существует</b>\n\n` +
              `У вас уже есть алерт для <b>${currency}</b> с процентом <b>${percent}%</b>\n\n` +
              `Попробуйте создать алерт с другим процентом`,
              {
                parse_mode: "HTML",
                reply_markup: KeyboardService.getMainMenu()
              }
            );
          }

          // Очищаем состояние после создания алерта
          stateManager.clearState(userId);
          return;
        } else {
          await ctx.reply(
            "❌ <b>Неверный процент</b>\n\n" +
            "Введите процент от 0.1 до 100\n" +
            "Например: <code>2%</code> или <code>5</code>",
            {
              parse_mode: "HTML"
            }
          );
          return;
        }
      } else {
        await ctx.reply(
          "❌ <b>Неверный формат</b>\n\n" +
          "Введите процент в формате: <code>2%</code> или <code>5</code>\n" +
          "Примеры: 1%, 2.5%, 10%",
          {
            parse_mode: "HTML"
          }
        );
        return;
      }
    }
  }

  // Обработка кнопок с постоянной клавиатуры
  switch (text) {
    case "💱 Курсы":
      const exchangeCmd = new ExchangeCommand(parserService);
      await exchangeCmd.execute(ctx as any);
      break;

    case "🥇 Золото":
      const goldCmd = new GoldCommand(parserService);
      await goldCmd.execute(ctx as any);
      break;

    case "📈 Акции":
      const stockCmd = new StockCommand(stockService);
      await stockCmd.execute(ctx as any);
      break;

    case "🧮 Калькулятор":
      await ctx.reply(
        "🧮 <b>Валютный калькулятор</b>\n\n" +
        "Выберите режим работы:",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getCalcMenu()
        }
      );
      break;

    case "📊 Статистика":
      const statsCmd = new StatsCommand(subscriberService, groupService);
      await statsCmd.execute(ctx as any);
      break;

    case "🔔 Подписка":
      if (userId) {
        const isSubscribed = subscriberService.isSubscribed(userId);
        await ctx.reply(
          "🔔 <b>Управление подпиской</b>\n\n" +
          `Текущий статус: ${isSubscribed ? '✅ Активна' : '❌ Неактивна'}`,
          {
            parse_mode: "HTML",
            reply_markup: KeyboardService.getSubscriptionMenu(isSubscribed)
          }
        );
      }
      break;

    case "❓ Помощь":
      const helpCmd = new HelpCommand();
      await helpCmd.execute(ctx as any);
      break;

    // Обработка быстрых сумм для калькулятора
    case "100":
    case "500":
    case "1000":
    case "5000":
    case "10000":
    case "50000":
      // Проверяем, находится ли пользователь в режиме калькулятора
      if (userId) {
        const userState = stateManager.getState(userId);

        if (userState && userState.action === 'calc_input') {
          const amount = parseFloat(text);
          const currency = userState.currency!;

          try {
            const result = await calculatorService.calculateCurrency(amount, currency, "KGS");

            await ctx.reply(result, {
              parse_mode: "HTML",
              reply_markup: KeyboardService.getMainMenu()
            });

            stateManager.clearState(userId);
            return;

          } catch (error) {
            await ctx.reply(
              "❌ <b>Ошибка расчета</b>\n\n" +
              "Не удалось получить актуальные курсы валют.",
              {
                parse_mode: "HTML",
                reply_markup: KeyboardService.getMainMenu()
              }
            );
            stateManager.clearState(userId);
            return;
          }
        } else {
          // Если пользователь не в режиме калькулятора, показываем выбор валют
          await ctx.reply(
            `💱 <b>Калькулятор: ${text} KGS</b>\n\n` +
            "Выберите валюту для конвертации:",
            {
              parse_mode: "HTML",
              reply_markup: KeyboardService.getCurrencyMenu()
            }
          );
        }
      }
      break;

    case "❌ Отмена":
      // Очищаем состояние пользователя при отмене
      if (userId) {
        stateManager.clearState(userId);
      }
      await ctx.reply(
        "❌ <b>Операция отменена</b>",
        {
          parse_mode: "HTML",
          reply_markup: KeyboardService.getMainMenu()
        }
      );
      break;

    default:
      // Если сообщение не распознано, показываем главное меню
      // await ctx.reply(
      //   "🤖 <b>Не понимаю эту команду</b>\n\n" +
      //   "Используйте кнопки ниже или команды:",
      //   {
      //     parse_mode: "HTML",
      //     reply_markup: KeyboardService.getMainMenu()
      //   }
      // );
      break;
  }
});

// Очистка старых состояний каждые 10 минут
setInterval(() => {
  stateManager.cleanup();
}, 10 * 60 * 1000);

// Start daily message scheduler
schedulerService.startDailyMessages();

// Start alert monitoring
alertMonitorService.startMonitoring();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down bot...');
  dbService.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down bot...');
  dbService.close();
  process.exit(0);
});

// Start the bot
bot.start();
webAdminService.start();

