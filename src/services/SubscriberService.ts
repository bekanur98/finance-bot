import type { Subscriber } from '../types';
import { DatabaseService } from './DatabaseService';

export class SubscriberService {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  addSubscriber(subscriber: Subscriber): boolean {
    return this.dbService.addSubscriber(subscriber);
  }

  removeSubscriber(userId: number): boolean {
    return this.dbService.removeSubscriber(userId);
  }

  isSubscribed(userId: number): boolean {
    return this.dbService.isSubscribed(userId);
  }

  getSubscribers(): Subscriber[] {
    return this.dbService.getSubscribers();
  }

  getSubscriberCount(): number {
    return this.dbService.getSubscriberCount();
  }

  getSubscriberById(userId: number): Subscriber | null {
    return this.dbService.getSubscriberById(userId);
  }

  getStats() {
    return this.dbService.getStats();
  }
}
