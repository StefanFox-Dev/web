import { appStore } from '../core/state';
import { ToastManager } from './toast-manager';
import { SoundFxService } from './sound-fx';
import { PlayerTranslate } from '../core/i18n';

export class ServerStatusComponent {
  private unsubscribes: Array<() => void> = [];

  constructor() {
    this.setupListeners();
    this.render();
  }

  private setupListeners(): void {
    const unsubOnline = appStore.subscribe(
      (s) => s.onlineCount,
      (count) => this.updateOnlineDisplay(count)
    );
    const unsubStatus = appStore.subscribe(
      (s) => s.serverOnline,
      (online) => this.updateStatusDisplay(online)
    );
    this.unsubscribes.push(unsubOnline, unsubStatus);

    const copyBtn = document.getElementById('copy-ip-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyServerIp());
    }
  }

  private updateOnlineDisplay(count: number): void {
    const el = document.getElementById('surv-online-count');
    if (el) {
      el.textContent = count.toString();
    }
  }

  private updateStatusDisplay(online: boolean): void {
    const label = document.querySelector<HTMLElement>('[lang="server_status_online"]');
    if (label) {
      label.textContent = online
        ? PlayerTranslate.translate('server_status_online')
        : PlayerTranslate.translate('server_status_offline');
      label.style.color = online ? 'var(--mc-accent)' : '#f44336';
    }
  }

  public copyServerIp(): void {
    SoundFxService.playClick();
    const ip = 'aezamine.com';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(ip).then(() => {
        ToastManager.show(PlayerTranslate.translate('ip_copied'));
        SoundFxService.playSuccess();
      }).catch(() => {
        this.fallbackCopy(ip);
      });
    } else {
      this.fallbackCopy(ip);
    }
  }

  private fallbackCopy(text: string): void {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      ToastManager.show(PlayerTranslate.translate('ip_copied'));
      SoundFxService.playSuccess();
    } catch {}
    document.body.removeChild(input);
  }

  private render(): void {
    const state = appStore.getState();
    this.updateOnlineDisplay(state.onlineCount);
    this.updateStatusDisplay(state.serverOnline);
  }

  public destroy(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
  }
}
