import cron from "node-cron";
import { Bot } from "grammy";
import { SubscriberService } from "./SubscriberService";
import { GroupService } from "./GroupService";
import { NBKRParserService } from "./NBKRParserService";

export class SchedulerService {
  private subscriberService: SubscriberService;
  private groupService: GroupService;
  private parserService: NBKRParserService;
  private bot: Bot;

  constructor(subscriberService: SubscriberService, groupService: GroupService, parserService: NBKRParserService, bot: Bot) {
    this.subscriberService = subscriberService;
    this.groupService = groupService;
    this.parserService = parserService;
    this.bot = bot;
  }

  startDailyMessages(): void {
    // Schedule a message every day at 09:05 local time
    cron.schedule("5 5 * * *", async () => {
      console.log('🕐 Starting daily financial report broadcast...');

      try {
        // Получаем актуальные данные
        const [rates, goldPrices] = await Promise.all([
          this.parserService.getCurrencyRates(),
          this.parserService.getGoldPrices()
        ]);

        const today = new Date();
        const formattedDate = today.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        // Формируем сообщение с курсами валют
        let exchangeMessage = `🌅 <b>Доброе утро!</b>\n\n`;
        exchangeMessage += `💰 <b>Курсы валют НБКР</b>\n📅 <i>${formattedDate}</i>\n\n`;

        rates.forEach(rate => {
          exchangeMessage += `${rate.flag} <b>${rate.currency}</b>  ➤  <code>${rate.rate}</code> сом\n`;
        });

        exchangeMessage += `\n<i>📊 Источник: Национальный банк КР</i>`;

        // Формируем сообщение с ценами на золото
        let goldMessage = `🥇 <b>Цены золотых мерных слитков</b>\n📅 <i>${formattedDate}</i>\n\n`;
        goldMessage += `<b>Масса (г)    Покупка (сом)    Продажа (сом)</b>\n`;
        goldMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

        goldPrices.forEach(price => {
          const formattedMass = price.mass.padEnd(8);
          const formattedBuy = price.buyPrice.padEnd(12);
          goldMessage += `<code>${formattedMass} ${formattedBuy} ${price.sellPrice}</code>\n`;
        });

        goldMessage += `\n<i>📊 Источник: Национальный банк КР</i>\n\n`;
        goldMessage += `📈 <i>Хорошего дня и удачных инвестиций!</i>`;

        // Send to individual subscribers
        const subscribers = this.subscriberService.getSubscribers();
        console.log(`📨 Sending financial report to ${subscribers.length} individual subscribers...`);

        for (const subscriber of subscribers) {
          try {
            // Отправляем курсы валют
            await this.bot.api.sendMessage(subscriber.id, exchangeMessage, {
              parse_mode: "HTML"
            });

            // Небольшая задержка между сообщениями
            await new Promise(resolve => setTimeout(resolve, 500));

            // Отправляем цены на золото
            await this.bot.api.sendMessage(subscriber.id, goldMessage, {
              parse_mode: "HTML"
            });

            // Задержка между пользователями чтобы не превысить лимиты
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.error(`Failed to send financial report to subscriber ${subscriber.id}:`, error);
          }
        }

        // Send to group subscribers
        const groupSubscribers = this.groupService.getGroupSubscribers();
        console.log(`📊 Sending financial report to ${groupSubscribers.length} group subscribers...`);

        for (const group of groupSubscribers) {
          try {
            // Добавляем персонализированное приветствие для группы
            const groupExchangeMessage = `🌅 <b>Доброе утро, ${group.chatTitle || 'группа'}!</b>\n\n` +
              exchangeMessage.substring(exchangeMessage.indexOf('💰'));

            // Отправляем курсы валют
            await this.bot.api.sendMessage(group.chatId, groupExchangeMessage, {
              parse_mode: "HTML"
            });

            // Небольшая задержка между сообщениями
            await new Promise(resolve => setTimeout(resolve, 500));

            // Отправляем цены на золото
            await this.bot.api.sendMessage(group.chatId, goldMessage, {
              parse_mode: "HTML"
            });

            // Задержка между группами
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (error) {
            console.error(`❌ Failed to send to group ${group.chatId}:`, error);

            // Type guard для проверки структуры ошибки
            if (error && typeof error === 'object' && 'error_code' in error) {
              const telegramError = error as { error_code: number };
              if (telegramError.error_code === 403 || telegramError.error_code === 400) {
                console.log(`🗑️ Removing inactive group: ${group.chatId}`);
                this.groupService.removeGroupSubscriber(group.chatId);
              }
            }
          }
        }

        console.log('✅ Daily financial report broadcast completed');

      } catch (error) {
        console.error('❌ Error during daily financial report broadcast:', error);

        // В случае ошибки отправляем простое приветствие
        await this.sendFallbackMessages();
      }
    });

    console.log("Daily financial report scheduler started for users and groups");
  }

  private async sendFallbackMessages(): Promise<void> {
    console.log('📨 Sending fallback greeting messages...');

    const fallbackMessage = `🌅 <b>Доброе утро!</b>\n\n` +
      `К сожалению, не удалось получить актуальные финансовые данные.\n` +
      `Вы можете проверить курсы валют командой /exchange\n` +
      `А цены на золото командой /gold\n\n` +
      `Хорошего дня! 😊`;

    // Send to individual subscribers
    const subscribers = this.subscriberService.getSubscribers();
    for (const subscriber of subscribers) {
      try {
        await this.bot.api.sendMessage(subscriber.id, fallbackMessage, {
          parse_mode: "HTML"
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to send fallback message to subscriber ${subscriber.id}:`, error);
      }
    }

    // Send to group subscribers
    const groupSubscribers = this.groupService.getGroupSubscribers();
    for (const group of groupSubscribers) {
      try {
        const groupFallbackMessage = `🌅 <b>Доброе утро, ${group.chatTitle || 'группа'}!</b>\n\n` +
          fallbackMessage.substring(fallbackMessage.indexOf('К сожалению'));

        await this.bot.api.sendMessage(group.chatId, groupFallbackMessage, {
          parse_mode: "HTML"
        });
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to send fallback message to group ${group.chatId}:`, error);
      }
    }
  }
}
