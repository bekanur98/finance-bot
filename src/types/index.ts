export interface Subscriber {
  id: number;
  firstName?: string | undefined;
  lastName?: string | undefined;
  username?: string | undefined;
  subscribedAt: Date;
}

export interface GroupSubscriber {
  chatId: number;
  chatTitle?: string;
  chatType: 'group' | 'supergroup' | 'channel';
  registeredBy: number; // User ID who registered the bot
  subscribedAt: Date;
}

export interface BotCommand {
  name: string;
  description: string;
  execute(ctx: any): Promise<void>;
}

export interface CommandHandler {
  register(bot: any): void;
}
