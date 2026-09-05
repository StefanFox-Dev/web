export class EventBus {
    listeners = new Map();
    on(event, handler) {
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
    off(event, handler) {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(handler);
            if (set.size === 0) {
                this.listeners.delete(event);
            }
        }
    }
    emit(event, data) {
        const set = this.listeners.get(event);
        if (set) {
            for (const handler of set) {
                try {
                    handler(data);
                }
                catch (err) {
                    console.error(`[EventBus] Error in handler for event '${event}':`, err);
                }
            }
        }
    }
    clear() {
        this.listeners.clear();
    }
}
export const globalEventBus = new EventBus();
//# sourceMappingURL=event-bus.js.map