import { appStore } from './state';

export class ClientRouter {
  private readonly popstateHandler: () => void;

  constructor() {
    this.popstateHandler = () => this.handleLocationChange();
    window.addEventListener('popstate', this.popstateHandler);
    this.handleLocationChange();
  }

  public navigate(tabId: string, replace = false): void {
    const cleanId = tabId.replace(/^#/, '');
    const url = `#${cleanId}`;

    if (replace) {
      window.history.replaceState({ tab: cleanId }, '', url);
    } else {
      window.history.pushState({ tab: cleanId }, '', url);
    }

    appStore.setState({ activeTab: cleanId });
  }

  private handleLocationChange(): void {
    const hash = window.location.hash.replace(/^#/, '').trim();
    const activeTab = hash || 'home';
    appStore.setState({ activeTab });
  }

  public destroy(): void {
    window.removeEventListener('popstate', this.popstateHandler);
  }
}

export const clientRouter = new ClientRouter();
