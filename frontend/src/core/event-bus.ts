export type EventHandler<T = any> = (data: T) => void;

export class EventBus {
  private readonly listeners = new Map<string, Set<EventHandler>>();

  public on<T = any>(event: string, handler: EventHandler<T>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  public off(event: string, handler: EventHandler): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<T = any>(event: string, data?: T): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[EventBus] Error in handler for event '${event}':`, err);
        }
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const globalEventBus = new EventBus();
