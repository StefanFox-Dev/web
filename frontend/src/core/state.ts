export interface AppState {
  language: 'ru' | 'uk' | 'en';
  activeTab: string;
  onlineCount: number;
  maxPlayers: number;
  serverOnline: boolean;
  latencyMs: number;
  selectedRankId: string | null;
  serverVersion: string;
}

export type StateSelector<T> = (state: AppState) => T;
export type StateListener<T> = (newValue: T, oldValue: T) => void;

interface Subscription<T> {
  selector: StateSelector<T>;
  listener: StateListener<T>;
  lastValue: T;
}

export class Store {
  private state: AppState;
  private readonly subscriptions = new Set<Subscription<any>>();

  constructor(initialState: AppState) {
    this.state = Object.freeze({ ...initialState });
  }

  public getState(): Readonly<AppState> {
    return this.state;
  }

  public setState(updater: Partial<AppState> | ((prev: AppState) => Partial<AppState>)): void {
    const prev = this.state;
    const partial = typeof updater === 'function' ? updater(prev) : updater;
    const next = Object.freeze({ ...prev, ...partial });

    if (Object.is(prev, next)) return;

    this.state = next;
    this.notifySubscribers(prev, next);
  }

  public subscribe<T>(selector: StateSelector<T>, listener: StateListener<T>): () => void {
    const sub: Subscription<T> = {
      selector,
      listener,
      lastValue: selector(this.state)
    };
    this.subscriptions.add(sub);

    return () => {
      this.subscriptions.delete(sub);
    };
  }

  private notifySubscribers(_oldState: AppState, newState: AppState): void {
    for (const sub of this.subscriptions) {
      try {
        const newVal = sub.selector(newState);
        const oldVal = sub.lastValue;
        if (!Object.is(newVal, oldVal)) {
          sub.lastValue = newVal;
          sub.listener(newVal, oldVal);
        }
      } catch (err) {
        console.error('[Store] Error notifying subscriber:', err);
      }
    }
  }

  public clear(): void {
    this.subscriptions.clear();
  }
}

export const appStore = new Store({
  language: 'ru',
  activeTab: 'home',
  onlineCount: 0,
  maxPlayers: 100,
  serverOnline: true,
  latencyMs: 0,
  selectedRankId: null,
  serverVersion: '1.20+'
});
