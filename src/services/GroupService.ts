import type { GroupSubscriber } from '../types';
import { DatabaseService } from './DatabaseService';

export class GroupService {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  addGroupSubscriber(group: GroupSubscriber): boolean {
    return this.dbService.addGroupSubscriber(group);
  }

  removeGroupSubscriber(chatId: number): boolean {
    return this.dbService.removeGroupSubscriber(chatId);
  }

  isGroupSubscribed(chatId: number): boolean {
    return this.dbService.isGroupSubscribed(chatId);
  }

  getGroupSubscribers(): GroupSubscriber[] {
    return this.dbService.getGroupSubscribers();
  }

  getGroupSubscriberCount(): number {
    return this.dbService.getGroupSubscriberCount();
  }
}
