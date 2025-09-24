// Система состояний для отслеживания контекста пользователя
export interface UserState {
  userId: number;
  action: string;
  currency?: string;
  amount?: number;
  timestamp: Date;
}

export class StateManager {
  private states: Map<number, UserState> = new Map();

  setState(userId: number, action: string, data?: any): void {
    this.states.set(userId, {
      userId,
      action,
      ...data,
      timestamp: new Date()
    });
  }

  getState(userId: number): UserState | undefined {
    return this.states.get(userId);
  }

  clearState(userId: number): void {
    this.states.delete(userId);
  }

  // Альтернативное название для совместимости
  resetState(userId: number): void {
    this.clearState(userId);
  }

  // Очистка старых состояний (старше 10 минут)
  cleanup(): void {
    const now = new Date();
    for (const [userId, state] of this.states.entries()) {
      const timeDiff = now.getTime() - state.timestamp.getTime();
      if (timeDiff > 10 * 60 * 1000) { // 10 минут
        this.states.delete(userId);
      }
    }
  }
}
