export class Store {
    state;
    subscriptions = new Set();
    constructor(initialState) {
        this.state = Object.freeze({ ...initialState });
    }
    getState() {
        return this.state;
    }
    setState(updater) {
        const prev = this.state;
        const partial = typeof updater === 'function' ? updater(prev) : updater;
        const next = Object.freeze({ ...prev, ...partial });
        if (Object.is(prev, next))
            return;
        this.state = next;
        this.notifySubscribers(prev, next);
    }
    subscribe(selector, listener) {
        const sub = {
            selector,
            listener,
            lastValue: selector(this.state)
        };
        this.subscriptions.add(sub);
        return () => {
            this.subscriptions.delete(sub);
        };
    }
    notifySubscribers(_oldState, newState) {
        for (const sub of this.subscriptions) {
            try {
                const newVal = sub.selector(newState);
                const oldVal = sub.lastValue;
                if (!Object.is(newVal, oldVal)) {
                    sub.lastValue = newVal;
                    sub.listener(newVal, oldVal);
                }
            }
            catch (err) {
                console.error('[Store] Error notifying subscriber:', err);
            }
        }
    }
    clear() {
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
//# sourceMappingURL=state.js.map