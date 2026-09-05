import { appStore } from './core/state';
import { clientRouter } from './core/router';
import { PlayerTranslate } from './core/i18n';
import { wsClient } from './services/ws-client';
import { apiClient } from './services/api-client';
import { ParticleEngine } from './components/particle-canvas';
import { ServerStatusComponent } from './components/server-status-card';
import { RanksCatalogComponent } from './components/ranks-catalog';
import { StaffBoardComponent } from './components/staff-board';
import { RulesViewerComponent } from './components/rules-viewer';
import { SkinViewerComponent } from './components/skin-viewer-card';
import { SoundFxService } from './components/sound-fx';
class Application {
    particles = null;
    statusComp = null;
    ranksComp = null;
    staffComp = null;
    rulesComp = null;
    skinComp = null;
    init() {
        try {
            this.particles = new ParticleEngine('mc-particles');
        }
        catch { }
        PlayerTranslate.updateDom();
        this.setupNavigation();
        this.setupLanguageSwitcher();
        this.statusComp = new ServerStatusComponent();
        this.ranksComp = new RanksCatalogComponent();
        this.staffComp = new StaffBoardComponent();
        this.rulesComp = new RulesViewerComponent();
        this.skinComp = new SkinViewerComponent();
        wsClient.connect();
        apiClient.getStatus().then((res) => {
            if (res && res.data) {
                appStore.setState({
                    serverOnline: Boolean(res.data.online),
                    onlineCount: res.data.onlinePlayers ?? 0,
                    maxPlayers: res.data.maxPlayers ?? 100,
                    latencyMs: res.data.latencyMs ?? 0
                });
            }
        }).catch(() => { });
        appStore.subscribe((s) => s.activeTab, (tab) => this.switchTabPane(tab));
    }
    setupNavigation() {
        const tabButtons = document.querySelectorAll('.mc-tab-btn');
        for (const btn of tabButtons) {
            btn.addEventListener('click', () => {
                SoundFxService.playClick();
                const target = btn.getAttribute('data-target');
                if (target) {
                    clientRouter.navigate(target);
                }
            });
        }
        const closeBtn = document.querySelector('.mc-btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                SoundFxService.playClick();
                clientRouter.navigate('home');
            });
        }
    }
    setupLanguageSwitcher() {
        const langBtn = document.getElementById('lang-change');
        if (langBtn) {
            langBtn.addEventListener('click', () => {
                SoundFxService.playClick();
                PlayerTranslate.toggleLanguage();
            });
        }
    }
    switchTabPane(targetId) {
        const tabButtons = document.querySelectorAll('.mc-tab-btn');
        for (const btn of tabButtons) {
            if (btn.getAttribute('data-target') === targetId) {
                btn.classList.add('active');
            }
            else {
                btn.classList.remove('active');
            }
        }
        const panes = document.querySelectorAll('.mc-pane');
        for (const pane of panes) {
            if (pane.id === targetId) {
                pane.classList.add('active');
            }
            else {
                pane.classList.remove('active');
            }
        }
    }
    destroy() {
        if (this.particles)
            this.particles.destroy();
        if (this.statusComp)
            this.statusComp.destroy();
        if (this.ranksComp)
            this.ranksComp.destroy();
        if (this.staffComp)
            this.staffComp.destroy();
        if (this.rulesComp)
            this.rulesComp.destroy();
        if (this.skinComp)
            this.skinComp.destroy();
        clientRouter.destroy();
        wsClient.destroy();
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const app = new Application();
    app.init();
});
//# sourceMappingURL=main.js.map