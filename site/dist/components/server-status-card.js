import { appStore } from '../core/state';
import { ToastManager } from './toast-manager';
import { SoundFxService } from './sound-fx';
import { PlayerTranslate } from '../core/i18n';
export class ServerStatusComponent {
    unsubscribes = [];
    constructor() {
        this.setupListeners();
        this.render();
    }
    setupListeners() {
        const unsubOnline = appStore.subscribe((s) => s.onlineCount, (count) => this.updateOnlineDisplay(count));
        const unsubStatus = appStore.subscribe((s) => s.serverOnline, (online) => this.updateStatusDisplay(online));
        this.unsubscribes.push(unsubOnline, unsubStatus);
        const copyBtn = document.getElementById('copy-ip-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyServerIp());
        }
    }
    updateOnlineDisplay(count) {
        const el = document.getElementById('surv-online-count');
        if (el) {
            el.textContent = count.toString();
        }
    }
    updateStatusDisplay(online) {
        const label = document.querySelector('[lang="server_status_online"]');
        if (label) {
            label.textContent = online
                ? PlayerTranslate.translate('server_status_online')
                : PlayerTranslate.translate('server_status_offline');
            label.style.color = online ? 'var(--mc-accent)' : '#f44336';
        }
    }
    copyServerIp() {
        SoundFxService.playClick();
        const ip = 'aezamine.com';
        if (navigator.clipboard) {
            navigator.clipboard.writeText(ip).then(() => {
                ToastManager.show(PlayerTranslate.translate('ip_copied'));
                SoundFxService.playSuccess();
            }).catch(() => {
                this.fallbackCopy(ip);
            });
        }
        else {
            this.fallbackCopy(ip);
        }
    }
    fallbackCopy(text) {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        try {
            document.execCommand('copy');
            ToastManager.show(PlayerTranslate.translate('ip_copied'));
            SoundFxService.playSuccess();
        }
        catch { }
        document.body.removeChild(input);
    }
    render() {
        const state = appStore.getState();
        this.updateOnlineDisplay(state.onlineCount);
        this.updateStatusDisplay(state.serverOnline);
    }
    destroy() {
        for (const unsub of this.unsubscribes) {
            unsub();
        }
        this.unsubscribes = [];
    }
}
//# sourceMappingURL=server-status-card.js.map