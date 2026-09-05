import { appStore } from './state';
export class ClientRouter {
    popstateHandler;
    constructor() {
        this.popstateHandler = () => this.handleLocationChange();
        window.addEventListener('popstate', this.popstateHandler);
        this.handleLocationChange();
    }
    navigate(tabId, replace = false) {
        const cleanId = tabId.replace(/^#/, '');
        const url = `#${cleanId}`;
        if (replace) {
            window.history.replaceState({ tab: cleanId }, '', url);
        }
        else {
            window.history.pushState({ tab: cleanId }, '', url);
        }
        appStore.setState({ activeTab: cleanId });
    }
    handleLocationChange() {
        const hash = window.location.hash.replace(/^#/, '').trim();
        const activeTab = hash || 'home';
        appStore.setState({ activeTab });
    }
    destroy() {
        window.removeEventListener('popstate', this.popstateHandler);
    }
}
export const clientRouter = new ClientRouter();
//# sourceMappingURL=router.js.map