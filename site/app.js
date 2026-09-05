class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(err);
                }
            });
        }
    }
}

class ToastService {
    static container = null;

    static init() {
        this.container = document.getElementById('mc-toast-container');
    }

    static show(message, duration = 2500) {
        if (!this.container) {
            this.container = document.getElementById('mc-toast-container');
        }
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'mc-toast-container';
            this.container.className = 'mc-toast-container';
            document.body.appendChild(this.container);
        }
        const toast = document.createElement('div');
        toast.className = 'mc-toast';
        toast.innerHTML = `<span>✨</span> <span>${message}</span>`;
        this.container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('mc-toast-show');
        });

        setTimeout(() => {
            toast.classList.remove('mc-toast-show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

class SoundFXService {
    static audioCtx = null;

    static init() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            try {
                this.audioCtx = new AudioContextClass();
            } catch {}
        }
    }

    static playClick() {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, this.audioCtx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.04);
        } catch {}
    }
}

class ParticleEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.numParticles = window.innerWidth < 768 ? 20 : 45;
        this.animId = null;
        this.init();
    }

    init() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        this.resize();
        window.addEventListener('resize', () => this.resize(), { passive: true });

        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push(this.createParticle());
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(this.animId);
            } else {
                this.loop();
            }
        });

        this.loop();
    }

    resize() {
        if (!this.canvas) return;
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
    }

    createParticle() {
        return {
            x: Math.random() * (this.width || window.innerWidth),
            y: Math.random() * (this.height || window.innerHeight),
            size: Math.random() * 2.5 + 1,
            speedY: -(Math.random() * 0.4 + 0.15),
            speedX: (Math.random() - 0.5) * 0.2,
            opacity: Math.random() * 0.6 + 0.2,
            color: Math.random() > 0.4 ? '#3ba55c' : '#ffffff'
        };
    }

    loop() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        for (let p of this.particles) {
            p.y += p.speedY;
            p.x += p.speedX;

            if (p.y < -10) {
                p.y = this.height + 10;
                p.x = Math.random() * this.width;
            }

            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.opacity;
            this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.floor(p.size), Math.floor(p.size));
        }

        this.animId = requestAnimationFrame(() => this.loop());
    }
}

class LocalizationEngine {
    constructor(translations, bus) {
        this.translations = translations;
        this.langs = Object.keys(translations);
        this.bus = bus;
        this.current = this.detectLanguage();
    }

    detectLanguage() {
        try {
            const saved = localStorage.getItem('mc_lang');
            if (saved && this.langs.includes(saved)) return saved;
            const navLang = navigator.language ? navigator.language.slice(0, 2).toLowerCase() : 'ru';
            if (navLang === 'uk' || navLang === 'ua') return 'uk';
            if (navLang === 'en') return 'en';
            return 'ru';
        } catch {
            return 'ru';
        }
    }

    setLanguage(lang) {
        if (!this.langs.includes(lang)) return;
        this.current = lang;
        try {
            localStorage.setItem('mc_lang', lang);
        } catch {}
        this.bus.emit('langChanged', {
            lang,
            data: this.translations[lang]
        });
    }

    toggleNext() {
        const nextIdx = (this.langs.indexOf(this.current) + 1) % this.langs.length;
        this.setLanguage(this.langs[nextIdx]);
    }

    get(key, fallback = '') {
        const pack = this.translations[this.current] || this.translations['ru'];
        return pack[key] || fallback;
    }
}

class UIController {
    constructor(bus, locale) {
        this.bus = bus;
        this.locale = locale;
        this.tabs = document.querySelectorAll('.mc-tab-btn');
        this.panes = document.querySelectorAll('.mc-pane');
        this.elements = document.querySelectorAll('[lang]');
        this.langBtn = document.getElementById('lang-change');
        this.init();
    }

    init() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                SoundFXService.playClick();
                const target = e.currentTarget.dataset.target;
                this.switchTab(target);
            });
        });

        if (this.langBtn) {
            this.langBtn.addEventListener('click', () => {
                SoundFXService.playClick();
                this.locale.toggleNext();
            });
        }

        document.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => {
                SoundFXService.playClick();
                const container = document.querySelector('.mc-form-container');
                if (container) {
                    container.style.transition = 'transform 0.22s var(--mc-spring-ease), opacity 0.2s ease';
                    container.style.transform = 'scale(0.92)';
                    container.style.opacity = '0';
                }
                setTimeout(() => window.location.reload(), 220);
            });
        });

        this.bus.on('langChanged', (payload) => this.applyTranslations(payload));
    }

    switchTab(targetId) {
        this.tabs.forEach(t => t.classList.toggle('active', t.dataset.target === targetId));
        this.panes.forEach(p => {
            if (p.id === targetId) {
                p.classList.add('active');
                p.scrollTop = 0;
            } else {
                p.classList.remove('active');
            }
        });
        this.bus.emit('tabSwitched', targetId);
    }

    applyTranslations({ lang, data }) {
        document.documentElement.lang = lang;
        if (this.langBtn) this.langBtn.textContent = lang.toUpperCase();

        this.elements.forEach(el => {
            const key = el.getAttribute('lang');
            if (data[key] !== undefined) {
                el.innerHTML = data[key];
            }
        });

        const isp = document.getElementById('isp-promo');
        if (isp) {
            isp.style.display = lang === 'uk' ? 'block' : 'none';
        }

        const tgLink = document.getElementById('tg-channel-link');
        if (tgLink) {
            tgLink.href = lang === 'en' ? 'https://t.me/aezamine' : 'https://t.me/aezamine_ru';
        }
    }
}

class ServerMonitorService {
    constructor(config, bus, locale) {
        this.config = config;
        this.bus = bus;
        this.locale = locale;
        this.onlineCountEl = document.getElementById('surv-online-count');
        this.copyIpBtn = document.getElementById('copy-ip-btn');
        this.init();
    }

    init() {
        this.bindEvents();
        this.fetchStatus();
        setInterval(() => this.fetchStatus(), this.config.interval || 30000);
    }

    bindEvents() {
        if (this.copyIpBtn) {
            this.copyIpBtn.addEventListener('click', () => {
                SoundFXService.playClick();
                this.copyToClipboard('aezamine.com:19132');
            });
        }

        document.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SoundFXService.playClick();
                const text = e.currentTarget.dataset.copy;
                this.copyToClipboard(text);
            });
        });
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            if (navigator.vibrate) navigator.vibrate(35);
            ToastService.show(this.locale.get('ip_copied', 'IP скопирован в буфер!'));
        } catch {
            const input = document.createElement('input');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
            ToastService.show(this.locale.get('ip_copied', 'IP скопирован в буфер!'));
        }
    }

    async fetchStatus() {
        if (!this.onlineCountEl) return;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(`${this.config.endpoint}${this.config.port}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const count = data.players?.online ?? (data.online ? 'Online' : '0');
            this.animateNumber(this.onlineCountEl, count);
        } catch (err) {
            if (this.onlineCountEl.textContent === '...') {
                this.onlineCountEl.textContent = '●';
            }
        }
    }

    animateNumber(element, finalVal) {
        if (typeof finalVal !== 'number') {
            element.textContent = finalVal;
            return;
        }
        const current = parseInt(element.textContent, 10) || 0;
        if (current === finalVal) {
            element.textContent = finalVal;
            return;
        }
        const diff = finalVal - current;
        const steps = 10;
        let step = 0;
        const timer = setInterval(() => {
            step++;
            element.textContent = Math.round(current + (diff * (step / steps)));
            if (step >= steps) {
                element.textContent = finalVal;
                clearInterval(timer);
            }
        }, 25);
    }
}

class TelegramNewsService {
    constructor(bus, locale) {
        this.bus = bus;
        this.locale = locale;
        this.container = document.getElementById('news-list-container');
        this.loadMoreBtn = document.getElementById('load-more-news');
        this.loader = document.getElementById('news-loading-indicator');
        this.batchSize = 6;
        
        this.latestSeeds = {
            ru: 655,
            en: 463,
        };

        this.currentChannel = 'aezamine_ru';
        this.currentId = this.latestSeeds.ru;

        this.init();
    }

    init() {
        this.setupPostMessageValidator();

        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener('click', () => {
                SoundFXService.playClick();
                this.loadBatch(6);
            });
        }

        this.bus.on('langChanged', ({ lang }) => {
            this.handleLanguageSwitch(lang);
        });

        this.handleLanguageSwitch(this.locale.current);
    }

    setupPostMessageValidator() {
        window.addEventListener('message', (event) => {
            if (event.origin !== 'https://telegram.org') return;
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (!data || data.event !== 'resize') return;

                let targetIframe = null;
                if (data.frame) {
                    targetIframe = document.querySelector(`iframe[name="${data.frame}"]`);
                }
                if (!targetIframe && this.container) {
                    const iframes = this.container.querySelectorAll('.mc-news-post iframe');
                    for (const iframe of iframes) {
                        if (iframe.contentWindow === event.source) {
                            targetIframe = iframe;
                            break;
                        }
                    }
                }

                if (targetIframe) {
                    const height = parseInt(data.height, 10) || 0;
                    if (height > 0) {
                        targetIframe.style.height = `${height}px`;
                        if (height < 115) {
                            const postWrapper = targetIframe.closest('.mc-news-post');
                            if (postWrapper) {
                                postWrapper.style.display = 'none';
                            }
                        }
                    }
                }
            } catch (e) {}
        });
    }

    handleLanguageSwitch(lang) {
        if (!this.container) return;
        this.container.innerHTML = '';

        if (lang === 'en') {
            this.currentChannel = 'aezamine';
            this.currentId = this.latestSeeds.en;
        } else {
            this.currentChannel = 'aezamine_ru';
            this.currentId = this.latestSeeds.ru;
        }

        if (this.loadMoreBtn) {
            this.loadMoreBtn.style.display = 'block';
        }

        this.loadBatch(this.batchSize);
    }

    loadBatch(count) {
        if (!this.container || this.currentId <= 0) return;
        const endId = Math.max(this.currentId - count, 0);

        for (let id = this.currentId; id > endId; id--) {
            this.appendPostWidget(this.currentChannel, id);
        }

        this.currentId = endId;

        if (this.currentId <= 0 && this.loadMoreBtn) {
            this.loadMoreBtn.style.display = 'none';
        }
    }

    appendPostWidget(channel, postId) {
        if (!this.container) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'mc-news-post';
        wrapper.dataset.channel = channel;
        wrapper.dataset.postId = postId;

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-post', `${channel}/${postId}`);
        script.setAttribute('data-width', '100%');
        script.setAttribute('data-dark', '1');

        wrapper.appendChild(script);
        this.container.appendChild(wrapper);
    }
}

class RanksService {
    static ranksData = null;

    static async init(bus, locale) {
        const container = document.getElementById('ranks-list-container');
        if (!container) return;

        try {
            const res = await fetch(`./ranks.json?t=${Date.now()}`);
            if (res.ok) {
                this.ranksData = await res.json();
            }
        } catch (e) {}

        if (!this.ranksData || !Array.isArray(this.ranksData) || this.ranksData.length === 0) {
            this.ranksData = this.getFallbackRanks();
        }

        const btnCards = document.getElementById('btn-view-cards');
        const btnCompare = document.getElementById('btn-view-compare');
        const cardsView = document.getElementById('ranks-cards-view');
        const compareView = document.getElementById('ranks-compare-view');

        if (btnCards && btnCompare && cardsView && compareView) {
            btnCards.addEventListener('click', () => {
                SoundFXService.playClick();
                btnCards.classList.add('active');
                btnCompare.classList.remove('active');
                cardsView.style.display = 'block';
                compareView.style.display = 'none';
            });

            btnCompare.addEventListener('click', () => {
                SoundFXService.playClick();
                btnCompare.classList.add('active');
                btnCards.classList.remove('active');
                cardsView.style.display = 'none';
                compareView.style.display = 'block';
                this.renderComparison(locale);
            });
        }

        const sel1 = document.getElementById('compare-select-1');
        const sel2 = document.getElementById('compare-select-2');

        if (sel1 && sel2) {
            sel1.innerHTML = '';
            sel2.innerHTML = '';
            this.ranksData.forEach((r) => {
                const opt1 = document.createElement('option');
                opt1.value = r.id;
                opt1.textContent = r.id;
                opt1.style.backgroundColor = '#1e1e1f';
                opt1.style.color = '#ffffff';
                sel1.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = r.id;
                opt2.textContent = r.id;
                opt2.style.backgroundColor = '#1e1e1f';
                opt2.style.color = '#ffffff';
                sel2.appendChild(opt2);
            });

            sel1.value = 'VIP';
            sel2.value = 'DELUXE';

            sel1.addEventListener('change', () => {
                SoundFXService.playClick();
                this.renderComparison(locale);
            });

            sel2.addEventListener('change', () => {
                SoundFXService.playClick();
                this.renderComparison(locale);
            });
        }

        const render = () => {
            container.innerHTML = '';
            const curLang = locale.current;
            const langData = locale.translations[curLang];

            this.ranksData.forEach(rank => {
                const card = document.createElement('div');
                card.className = 'mc-rank-card';
                card.style.setProperty('--mc-rank-color', rank.color);

                card.innerHTML = `
                    <div class="mc-rank-header">
                        <div class="mc-rank-title-group">
                            <span class="mc-rank-name">${rank.id}</span>
                        </div>
                        <span class="mc-rank-badge" style="background:rgba(255,255,255,0.12)">${rank.hp}</span>
                    </div>
                    <div class="mc-rank-summary-grid">
                        <div class="mc-rank-summary-item">
                            <span class="mc-label">${langData.rank_lbl_rg || 'Регионы'}</span>
                            <span class="mc-rank-summary-val">${rank.rgCount} (${rank.rgBlocks})</span>
                        </div>
                        <div class="mc-rank-summary-item">
                            <span class="mc-label">${langData.rank_lbl_homes || 'Дома / Варпы'}</span>
                            <span class="mc-rank-summary-val">${rank.homes} / ${rank.warps}</span>
                        </div>
                        <div class="mc-rank-summary-item">
                            <span class="mc-label">${langData.rank_lbl_saveinv || 'Сохранение'}</span>
                            <span class="mc-rank-summary-val">${rank.saveInv}</span>
                        </div>
                        <div class="mc-rank-summary-item">
                            <span class="mc-label">${langData.rank_lbl_xp || 'Множитель опыта'}</span>
                            <span class="mc-rank-summary-val">${rank.xp || '0%'}</span>
                        </div>
                    </div>
                    <button class="mc-btn mc-btn-green mc-margin-top" style="width:100%; margin-top:8px; font-size:9px;">
                        ${langData.rank_btn_details || 'Возможности'}
                    </button>
                `;

                card.addEventListener('click', () => {
                    SoundFXService.playClick();
                    this.openRankModal(rank, locale);
                });

                container.appendChild(card);
            });

            this.renderComparison(locale);
        };

        render();
        bus.on('langChanged', render);
    }

    static renderComparison(locale) {
        const tableContainer = document.getElementById('ranks-compare-table-container');
        const sel1 = document.getElementById('compare-select-1');
        const sel2 = document.getElementById('compare-select-2');
        if (!tableContainer || !sel1 || !sel2 || !this.ranksData) return;

        const rankA = this.ranksData.find(r => r.id === sel1.value) || this.ranksData[0];
        const rankB = this.ranksData.find(r => r.id === sel2.value) || this.ranksData[1];

        const curLang = locale.current;
        const langData = locale.translations[curLang];

        const getCmdList = (r) => (r.commands || []).map(c => c.name).join(', ') || '—';

        const rows = [
            { label: langData.rank_lbl_hp || 'Здоровье (HP)', valA: rankA.hp, valB: rankB.hp },
            { label: langData.rank_lbl_rg || 'Регионы (Кол-во)', valA: rankA.rgCount, valB: rankB.rgCount },
            { label: langData.compare_rg_blocks || 'Размер региона (Блоков)', valA: rankA.rgBlocks, valB: rankB.rgBlocks },
            { label: langData.rank_lbl_homes || 'Точек дома (/sethome)', valA: rankA.homes, valB: rankB.homes },
            { label: langData.rank_lbl_warps || 'Точек варпа (/setwarp)', valA: rankA.warps, valB: rankB.warps },
            { label: langData.rank_lbl_saveinv || 'Сохранение инвентаря', valA: rankA.saveInv, valB: rankB.saveInv },
            { label: langData.rank_lbl_xp || 'Множитель опыта (+XP)', valA: rankA.xp || '0%', valB: rankB.xp || '0%' },
            { label: langData.rank_lbl_bans || 'Макс. срок бана', valA: rankA.banLimit, valB: rankB.banLimit },
            { label: langData.compare_commands || 'Основные команды', valA: getCmdList(rankA), valB: getCmdList(rankB) }
        ];

        let tableHtml = `
            <table class="mc-compare-table">
                <thead>
                    <tr>
                        <th class="mc-compare-feature">${langData.compare_feature || 'Параметр'}</th>
                        <th style="color:${rankA.color}">${rankA.id}</th>
                        <th style="color:${rankB.color}">${rankB.id}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        rows.forEach(row => {
            const isDiff = row.valA !== row.valB;
            tableHtml += `
                <tr>
                    <td class="mc-compare-feature">${row.label}</td>
                    <td class="mc-compare-val ${isDiff ? 'mc-diff-better' : ''}">${row.valA}</td>
                    <td class="mc-compare-val ${isDiff ? 'mc-diff-better' : ''}">${row.valB}</td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
            </table>
        `;

        tableContainer.innerHTML = tableHtml;
    }

    static openRankModal(rank, locale) {
        const curLang = locale.current;
        const langData = locale.translations[curLang];

        let modal = document.getElementById('rank-modal-overlay');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'rank-modal-overlay';
        modal.className = 'mc-rank-detail-modal active';

        const cmdHtml = (rank.commands || []).map(cmd => {
            const desc = curLang === 'en' ? (cmd.desc_en || cmd.desc_ru) : (curLang === 'uk' ? (cmd.desc_uk || cmd.desc_ru) : cmd.desc_ru);
            return `
                <div class="mc-rank-cmd-item">
                    <span class="mc-rank-cmd-name" style="--mc-rank-color:${rank.color}">${cmd.name}</span>
                    <span class="mc-rank-cmd-desc">${desc || ''}</span>
                </div>
            `;
        }).join('');

        const otherText = curLang === 'en' ? (rank.other_en || rank.other_ru) : (curLang === 'uk' ? (rank.other_uk || rank.other_ru) : rank.other_ru);
        const otherHtml = otherText ? `
            <div class="mc-card mc-margin-top" style="margin-top:14px;">
                <h3 class="mc-subtitle" style="color:${rank.color}; margin-bottom:10px;">✨ ${langData.rank_sec_other || 'Особые возможности'}</h3>
                <div style="font-size:10px; line-height:1.7; color:var(--mc-text-main); white-space:pre-line;">
                    ${otherText}
                </div>
            </div>
        ` : '';

        modal.innerHTML = `
            <div class="mc-rank-modal-box">
                <div class="mc-rank-modal-header">
                    <div class="mc-rank-title-group">
                        <span class="mc-rank-name" style="color:${rank.color}">${rank.id}</span>
                    </div>
                    <button class="mc-btn mc-btn-close" id="close-rank-modal">✕</button>
                </div>
                <div class="mc-rank-modal-body">
                    <div class="mc-card">
                        <h3 class="mc-subtitle" style="color:${rank.color}; margin-bottom:12px;">📊 ${langData.rank_sec_stats || 'Характеристики и лимиты'}</h3>
                        <div class="mc-rank-summary-grid" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
                            <div class="mc-rank-summary-item">
                                <span class="mc-label">${langData.rank_lbl_rg || 'Регионы (Макс. блоков)'}</span>
                                <span class="mc-rank-summary-val">${rank.rgCount} (${rank.rgBlocks})</span>
                            </div>
                            <div class="mc-rank-summary-item">
                                <span class="mc-label">${langData.rank_lbl_homes || 'Точек дома (/sethome)'}</span>
                                <span class="mc-rank-summary-val">${rank.homes}</span>
                            </div>
                            <div class="mc-rank-summary-item">
                                <span class="mc-label">${langData.rank_lbl_warps || 'Варпов (/setwarp)'}</span>
                                <span class="mc-rank-summary-val">${rank.warps}</span>
                            </div>
                            <div class="mc-rank-summary-item">
                                <span class="mc-label">${langData.rank_lbl_hp || 'Здоровье игрока'}</span>
                                <span class="mc-rank-summary-val">${rank.hp}</span>
                            </div>
                            <div class="mc-rank-summary-item">
                                <span class="mc-label">${langData.rank_lbl_saveinv || 'Сохранение инвентаря'}</span>
                                <span class="mc-rank-summary-val">${rank.saveInv}</span>
                            </div>
                            <div class="mc-rank-summary-item">
                                <span class="mc-label">${langData.rank_lbl_xp || 'Множитель опыта'}</span>
                                <span class="mc-rank-summary-val">${rank.xp || '0%'}</span>
                            </div>
                            <div class="mc-rank-summary-item">
                                <span class="mc-label">${langData.rank_lbl_bans || 'Макс. срок бана'}</span>
                                <span class="mc-rank-summary-val">${rank.banLimit}</span>
                            </div>
                        </div>
                    </div>

                    <div class="mc-card mc-margin-top" style="margin-top:14px;">
                        <h3 class="mc-subtitle" style="color:${rank.color}; margin-bottom:12px;">⚡ ${langData.rank_sec_cmds || 'Команды и возможности'}</h3>
                        <div class="mc-rank-cmd-list">
                            ${cmdHtml}
                        </div>
                    </div>

                    ${otherHtml}
                </div>
                <div class="mc-rank-modal-footer">
                    <button id="rank-buy-btn" class="mc-btn mc-btn-green" style="width:100%; padding:14px; font-size:11px;">
                        🛒 ${langData.rank_btn_buy || 'Купить привилегию'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            modal.remove();
        };

        modal.querySelector('#close-rank-modal').addEventListener('click', () => {
            SoundFXService.playClick();
            closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.querySelector('#rank-buy-btn').addEventListener('click', () => {
            SoundFXService.playClick();
            closeModal();
            const donateTab = document.querySelector('[data-target="donate"]');
            if (donateTab) donateTab.click();
        });
    }

    static getFallbackRanks() {
        return [
            {
                id: "PLAYER",
                prefix: "ИГРОК",
                color: "#9E9E9E",
                hp: "20 HP",
                rgCount: "5 шт",
                rgBlocks: "58 блоков",
                homes: "5",
                warps: "0",
                saveInv: "0%",
                xp: "0%",
                banLimit: "0",
                commands: [
                    { name: "/menu", desc_ru: "Главное меню", desc_en: "Main menu", desc_uk: "Головне меню" },
                    { name: "/spawn", desc_ru: "Телепортация на спавн", desc_en: "Spawn", desc_uk: "Спавн" },
                    { name: "/rtp", desc_ru: "Случайная телепортация", desc_en: "Random TP", desc_uk: "Випадковий тп" },
                    { name: "/sethome", desc_ru: "Установить точку дома", desc_en: "Set home point", desc_uk: "Встановити дім" },
                    { name: "/home", desc_ru: "Телепортация домой", desc_en: "Teleport home", desc_uk: "Телепортація додому" },
                    { name: "/pay", desc_ru: "Перевести игровую валюту", desc_en: "Pay money", desc_uk: "Переказати гроші" },
                    { name: "/tpa", desc_ru: "Запрос на телепортацию", desc_en: "TPA request", desc_uk: "Запит на тп" }
                ],
                other_ru: "Базовый набор игрока, доступ к общим варпам и магазину.",
                other_en: "Base player package, access to public warps and shop.",
                other_uk: "Базовий набір гравця, доступ до загальних варпів та магазину."
            },
            {
                id: "VIP",
                prefix: "VIP",
                color: "#4CAF50",
                hp: "20 HP (10❤)",
                rgCount: "7 шт",
                rgBlocks: "60 блоков",
                homes: "7",
                warps: "0",
                saveInv: "10%",
                xp: "0%",
                banLimit: "—",
                commands: [
                    { name: "/kit vip", desc_ru: "Получить стартовый набор VIP", desc_en: "Get VIP kit", desc_uk: "Отримати стартовий набір VIP" },
                    { name: "/suicide", desc_ru: "Совершить самоубийство", desc_en: "Suicide", desc_uk: "Вчинити самогубство" },
                    { name: "/who", desc_ru: "Интерактивное сообщение от случайного игрока", desc_en: "Random player message", desc_uk: "Інтерактивне повідомлення" },
                    { name: "/pos", desc_ru: "Узнать координаты блока/игрока", desc_en: "Get coordinates", desc_uk: "Дізнатися координати" },
                    { name: "/setjoin", desc_ru: "Настроить уникальное сообщение входа", desc_en: "Custom join message", desc_uk: "Унікальне повідомлення входу" },
                    { name: "/setquit", desc_ru: "Настроить уникальное сообщение выхода", desc_en: "Custom quit message", desc_uk: "Унікальне повідомлення виходу" },
                    { name: "/food", desc_ru: "Утолить голод игроку", desc_en: "Restore hunger", desc_uk: "Втамувати голод" },
                    { name: "/fly", desc_ru: "Режим полёта", desc_en: "Fly mode", desc_uk: "Режим польоту" },
                    { name: "/god", desc_ru: "Режим бессмертия", desc_en: "God mode", desc_uk: "Режим безсмертя" }
                ],
                other_ru: "Вес голоса за время и погоду: 3",
                other_en: "Vote weight for time & weather: 3",
                other_uk: "Вага голосу за час та погоду: 3"
            },
            {
                id: "ELITE",
                prefix: "ELITE",
                color: "#00BCD4",
                hp: "20 HP",
                rgCount: "9 шт",
                rgBlocks: "65 блоков",
                homes: "9",
                warps: "0",
                saveInv: "20%",
                xp: "+10%",
                banLimit: "—",
                commands: [
                    { name: "/kit elite", desc_ru: "Набор ELITE", desc_en: "Elite kit", desc_uk: "Набір ELITE" },
                    { name: "/gm", desc_ru: "Игровой режим", desc_en: "Gamemode", desc_uk: "Ігровий режим" },
                    { name: "/back", desc_ru: "Точка смерти", desc_en: "Death back", desc_uk: "Точка смерті" },
                    { name: "/heal", desc_ru: "Восстановить здоровье", desc_en: "Restore health", desc_uk: "Відновити здоров'я" },
                    { name: "/fly", desc_ru: "Режим полета", desc_en: "Fly mode", desc_uk: "Режим польоту" },
                    { name: "/feed", desc_ru: "Утолить голод", desc_en: "Feed", desc_uk: "Погодувати" }
                ],
                other_ru: "Вес голоса за время и погоду: 4",
                other_en: "Vote weight for time & weather: 4",
                other_uk: "Вага голосу за час та погоду: 4"
            },
            {
                id: "ULTRA",
                prefix: "ULTRA",
                color: "#3F51B5",
                hp: "20 HP",
                rgCount: "15 шт",
                rgBlocks: "65 блоков",
                homes: "18",
                warps: "0",
                saveInv: "25%",
                xp: "+20%",
                banLimit: "Мут 8 дней",
                commands: [
                    { name: "/kit ultra", desc_ru: "Набор ULTRA", desc_en: "Ultra kit", desc_uk: "Набір ULTRA" },
                    { name: "/mute", desc_ru: "Блокировка чата нарушителям", desc_en: "Mute player", desc_uk: "Блокування чату" },
                    { name: "/craft", desc_ru: "Верстак в любом месте", desc_en: "Portable workbench", desc_uk: "Верстак будь-де" },
                    { name: "/enderchest", desc_ru: "Эндер-сундук", desc_en: "Ender chest", desc_uk: "Ендер-скриня" },
                    { name: "/fly", desc_ru: "Режим полета", desc_en: "Fly mode", desc_uk: "Режим польоту" }
                ],
                other_ru: "Вес голоса за время и погоду: 5",
                other_en: "Vote weight for time & weather: 5",
                other_uk: "Вага голосу за час та погоду: 5"
            },
            {
                id: "ENDER",
                prefix: "ENDER",
                color: "#9C27B0",
                hp: "20 HP",
                rgCount: "22 шт",
                rgBlocks: "75 блоков",
                homes: "25",
                warps: "10",
                saveInv: "30%",
                xp: "+30%",
                banLimit: "Бан 11 дней",
                commands: [
                    { name: "/kit ender", desc_ru: "Набор ENDER", desc_en: "Ender kit", desc_uk: "Набір ENDER" },
                    { name: "/ban", desc_ru: "Бан игроков", desc_en: "Ban player", desc_uk: "Бан гравців" },
                    { name: "/unban", desc_ru: "Разбан игроков", desc_en: "Unban player", desc_uk: "Розбан гравців" },
                    { name: "/near", desc_ru: "Поиск игроков рядом", desc_en: "Check nearby players", desc_uk: "Пошук гравців поруч" }
                ],
                other_ru: "Вес голоса за время и погоду: 6",
                other_en: "Vote weight for time & weather: 6",
                other_uk: "Вага голосу за час та погоду: 6"
            },
            {
                id: "GOLD",
                prefix: "GOLD",
                color: "#FFC107",
                hp: "20 HP",
                rgCount: "25 шт",
                rgBlocks: "80 блоков",
                homes: "31",
                warps: "20",
                saveInv: "35%",
                xp: "+40%",
                banLimit: "Бан 21 день",
                commands: [
                    { name: "/kit gold", desc_ru: "Набор GOLD", desc_en: "Gold kit", desc_uk: "Набір GOLD" },
                    { name: "/vanish", desc_ru: "Полная невидимость", desc_en: "Invisibility", desc_uk: "Повна невидимість" },
                    { name: "/speed", desc_ru: "Увеличение скорости", desc_en: "Speed boost", desc_uk: "Збільшення швидкості" },
                    { name: "/jump", desc_ru: "Высокий прыжок", desc_en: "High jump", desc_uk: "Високий стрибок" }
                ],
                other_ru: "Вес голоса за время и погоду: 7",
                other_en: "Vote weight for time & weather: 7",
                other_uk: "Вага голосу за час та погоду: 7"
            },
            {
                id: "LEGEND",
                prefix: "LEGEND",
                color: "#E91E63",
                hp: "20 HP",
                rgCount: "28 шт",
                rgBlocks: "90 блоков",
                homes: "36",
                warps: "25",
                saveInv: "40%",
                xp: "+50%",
                banLimit: "Бан 32 дня",
                commands: [
                    { name: "/kit legend", desc_ru: "Набор LEGEND", desc_en: "Legend kit", desc_uk: "Набір LEGEND" },
                    { name: "/set", desc_ru: "Сетка WorldEdit", desc_en: "WorldEdit set", desc_uk: "WorldEdit сітка" },
                    { name: "/copy", desc_ru: "Копирование построек", desc_en: "Copy schematic", desc_uk: "Копіювання будівель" },
                    { name: "/paste", desc_ru: "Вставка построек", desc_en: "Paste schematic", desc_uk: "Вставка будівель" }
                ],
                other_ru: "Вес голоса за время и погоду: 8",
                other_en: "Vote weight for time & weather: 8",
                other_uk: "Вага голосу за час та погоду: 8"
            },
            {
                id: "WEE",
                prefix: "WEE",
                color: "#00E676",
                hp: "20 HP",
                rgCount: "30 шт",
                rgBlocks: "105 блоков",
                homes: "42",
                warps: "29",
                saveInv: "40%",
                xp: "+60%",
                banLimit: "Бан 93 дня",
                commands: [
                    { name: "/kit wee", desc_ru: "Набор WEE", desc_en: "Wee kit", desc_uk: "Набір WEE" },
                    { name: "/freedonate VIP", desc_ru: "Выдача VIP игрокам", desc_en: "Grant VIP", desc_uk: "Видача VIP гравцям" },
                    { name: "/kick", desc_ru: "Кикнуть игрока", desc_en: "Kick player", desc_uk: "Кікнути гравця" }
                ],
                other_ru: "Вес голоса за время и погоду: 9",
                other_en: "Vote weight for time & weather: 9",
                other_uk: "Вага голосу за час та погоду: 9"
            },
            {
                id: "OWNER",
                prefix: "OWNER",
                color: "#FF9100",
                hp: "22 HP",
                rgCount: "40 шт",
                rgBlocks: "115 блоков",
                homes: "60",
                warps: "42",
                saveInv: "50%",
                xp: "+70%",
                banLimit: "Бан 214 дней",
                commands: [
                    { name: "/kit owner", desc_ru: "Набор OWNER", desc_en: "Owner kit", desc_uk: "Набір OWNER" },
                    { name: "/freedonate ELITE", desc_ru: "Выдача ELITE игрокам", desc_en: "Grant ELITE", desc_uk: "Видача ELITE гравцям" },
                    { name: "/nightvision", desc_ru: "Бесконечное ночное зрение", desc_en: "Night vision", desc_uk: "Нічний зір" },
                    { name: "/ptime", desc_ru: "Персональное время", desc_en: "Personal time", desc_uk: "Персональний час" }
                ],
                other_ru: "Вес голоса за время и погоду: 10",
                other_en: "Vote weight for time & weather: 10",
                other_uk: "Вага голосу за час та погоду: 10"
            },
            {
                id: "DELUXE",
                prefix: "DELUXE",
                color: "#D500F9",
                hp: "24 HP",
                rgCount: "45 шт",
                rgBlocks: "130 блоков",
                homes: "70",
                warps: "52",
                saveInv: "70%",
                xp: "+80%",
                banLimit: "Бан 397 дней",
                commands: [
                    { name: "/kit deluxe", desc_ru: "Набор DELUXE", desc_en: "Deluxe kit", desc_uk: "Набір DELUXE" },
                    { name: "/tpcome", desc_ru: "Телепортация к себе", desc_en: "Force teleport", desc_uk: "Телепортація до себе" },
                    { name: "/freedonate ULTRA", desc_ru: "Выдача ULTRA игрокам", desc_en: "Grant ULTRA", desc_uk: "Видача ULTRA гравцям" },
                    { name: "/invsee", desc_ru: "Просмотр чужого инвентаря", desc_en: "View inventory", desc_uk: "Перегляд інвентарю" }
                ],
                other_ru: "Вес голоса за время и погоду: 12",
                other_en: "Vote weight for time & weather: 12",
                other_uk: "Вага голосу за час та погоду: 12"
            },
            {
                id: "HELPER",
                prefix: "HELPER",
                color: "#29B6F6",
                hp: "26 HP",
                rgCount: "65 шт",
                rgBlocks: "230 блоков",
                homes: "90",
                warps: "75",
                saveInv: "80%",
                xp: "+90%",
                banLimit: "Бан 730 дней",
                commands: [
                    { name: "/kit helper", desc_ru: "Набор HELPER", desc_en: "Helper kit", desc_uk: "Набір HELPER" },
                    { name: "/top", desc_ru: "Телепортация на самый верх", desc_en: "Top block", desc_uk: "Нагору" },
                    { name: "/antitpcome", desc_ru: "Защита от насильного тп", desc_en: "Anti-tp", desc_uk: "Анти-тп" },
                    { name: "/co i", desc_ru: "Проверка логов и грифа блоков", desc_en: "CoreProtect inspect", desc_uk: "Перевірка блоків" }
                ],
                other_ru: "Вес голоса за время и погоду: 15",
                other_en: "Vote weight for time & weather: 15",
                other_uk: "Вага голосу за час та погоду: 15"
            },
            {
                id: "ADMIN",
                prefix: "ADMIN",
                color: "#F44336",
                hp: "60 HP",
                rgCount: "Безлимит",
                rgBlocks: "Безлимит",
                homes: "Безлимит",
                warps: "Безлимит",
                saveInv: "100%",
                xp: "+100%",
                banLimit: "Вечный бан",
                commands: [
                    { name: "/kit admin", desc_ru: "Набор ADMIN", desc_en: "Admin kit", desc_uk: "Набір ADMIN" },
                    { name: "/tpworld", desc_ru: "Перемещение между мирами", desc_en: "World change", desc_uk: "Зміна світів" },
                    { name: "/clear other", desc_ru: "Очистка чужого инвентаря", desc_en: "Clear inventory", desc_uk: "Очищення інвентарю" },
                    { name: "/stop", desc_ru: "Перезагрузка сервера", desc_en: "Restart server", desc_uk: "Перезапуск сервера" }
                ],
                other_ru: "Полный иммунитет к наказаниям, максимальный приоритет.",
                other_en: "Full immunity to punishments, maximum server priority.",
                other_uk: "Повний імунітет до покарань, максимальний пріоритет."
            }
        ];
    }
}

class StaffService {
    static async init(bus, locale) {
        const container = document.getElementById('staff-list-container');
        if (!container) return;

        let staffData = [];
        try {
            const res = await fetch(`./staff.json?t=${Date.now()}`);
            if (res.ok) {
                staffData = await res.json();
            }
        } catch (e) {}

        if (!staffData || !Array.isArray(staffData) || staffData.length === 0) {
            staffData = [
                { name: "Sony", rank: "ADMIN", date: "2023-09-01", activity: 98, warnings: 0 },
                { name: "AezaOwner", rank: "ADMIN", date: "2023-10-15", activity: 95, warnings: 0 },
                { name: "AlexCraft", rank: "HELPER", date: "2024-04-12", activity: 88, warnings: 0 },
                { name: "CyberKnight", rank: "HELPER", date: "2024-08-20", activity: 82, warnings: 0 }
            ];
        }

        const render = () => {
            container.innerHTML = '';
            const curLang = locale.current;
            const langData = locale.translations[curLang];

            const groups = { ADMIN: [], HELPER: [] };
            staffData.forEach(s => {
                if (groups[s.rank]) groups[s.rank].push(s);
            });

            ['ADMIN', 'HELPER'].forEach(rankKey => {
                const members = groups[rankKey];
                if (members.length === 0) return;

                const title = document.createElement('h3');
                title.className = 'mc-staff-group-title';
                title.textContent = langData[`rank_${rankKey}`] || rankKey;
                container.appendChild(title);

                members.forEach(staff => {
                    let formattedDate = staff.date;
                    const parts = String(staff.date).split('-');
                    if (parts.length === 3) {
                        const y = parts[0];
                        const m = parseInt(parts[1], 10);
                        const monthName = langData[`month_${m}`];
                        if (monthName) {
                            formattedDate = `${langData.staff_since || 'С'} ${monthName} ${y}`;
                        }
                    }

                    let actClass = 'mc-stat-med';
                    if (staff.activity >= 80) actClass = 'mc-stat-high';
                    else if (staff.activity < 40) actClass = 'mc-stat-low';

                    const card = document.createElement('div');
                    card.className = 'mc-staff-card';
                    card.innerHTML = `
                        <div class="mc-staff-header">
                            <div class="mc-staff-info">
                                <span class="mc-staff-name">${staff.name}</span>
                                <span class="mc-staff-date">${formattedDate}</span>
                            </div>
                            <img src="https://mc-heads.net/avatar/${staff.name}/100" class="mc-staff-avatar" alt="${staff.name}" onerror="this.src='./img/logo.png'">
                        </div>
                        <div class="mc-staff-stats">
                            <div class="mc-staff-stat-block">
                                <span class="mc-staff-stat-val ${actClass}">${staff.activity}%</span>
                                <span class="mc-staff-stat-label">${langData.staff_act || 'Активность'}</span>
                            </div>
                            <div class="mc-staff-stat-block" style="text-align:right;">
                                <span class="mc-staff-stat-val">${staff.warnings}<span style="color:var(--mc-text-muted)">/3</span></span>
                                <span class="mc-staff-stat-label">${langData.staff_warns || 'Выговоры'}</span>
                            </div>
                        </div>
                    `;
                    container.appendChild(card);
                });
            });
        };

        render();
        bus.on('langChanged', render);
    }
}

class RulesService {
    static async init(bus, locale) {
        const container = document.getElementById('rules-list-container');
        if (!container) return;

        let rulesData = null;
        try {
            const res = await fetch(`./rules.json?t=${Date.now()}`);
            if (res.ok) {
                rulesData = await res.json();
            }
        } catch (e) {}

        if (!rulesData) {
            rulesData = this.getFallbackRules();
        }

        const render = () => {
            container.innerHTML = '';
            const curLang = locale.current;

            if (rulesData.info) {
                const infoText = curLang === 'en' ? rulesData.info.text_en : (curLang === 'uk' ? rulesData.info.text_uk : rulesData.info.text_ru);
                if (infoText) {
                    const infoCard = document.createElement('div');
                    infoCard.className = 'mc-card mc-margin-top';
                    infoCard.style.background = 'rgba(255, 215, 0, 0.08)';
                    infoCard.style.borderColor = 'rgba(255, 215, 0, 0.35)';
                    infoCard.innerHTML = `
                        <div style="font-size:10px; line-height:1.7; color:var(--mc-text-main); white-space:pre-line;">
                            ${infoText}
                        </div>
                    `;
                    container.appendChild(infoCard);
                }
            }

            Object.keys(rulesData).forEach(key => {
                if (key === 'info') return;
                const cat = rulesData[key];
                const title = curLang === 'en' ? cat.title_en : (curLang === 'uk' ? cat.title_uk : cat.title_ru);
                const text = curLang === 'en' ? cat.text_en : (curLang === 'uk' ? cat.text_uk : cat.text_ru);

                if (!title || !text) return;

                const card = document.createElement('div');
                card.className = 'mc-card mc-margin-top';
                card.style.borderLeft = '4px solid var(--mc-accent)';
                card.innerHTML = `
                    <h3 class="mc-subtitle" style="color:var(--mc-accent); margin-bottom:10px;">📜 ${title}</h3>
                    <div style="font-size:10px; line-height:1.7; color:var(--mc-text-main); white-space:pre-line;">
                        ${text}
                    </div>
                `;
                container.appendChild(card);
            });
        };

        render();
        bus.on('langChanged', render);
    }

    static getFallbackRules() {
        return {
            info: {
                text_ru: "⚡ Если выдаете наказание, приготовьте доказательства: скриншот или видео нарушения. Запросить доказательства может только администрация.\n\n• Возможно смягчение наказаний на усмотрение игрока, выдающего наказание, но не меньше половины указанного срока в правилах.\n• Незнание правил не освобождает от ответственности. Начав играть на наших серверах, Вы автоматически подтверждаете согласие с правилами.\n• Срок подачи апелляции на бан / снятие доната составляет 1 день.\n• Ответственность за нарушения несет исключительно владелец аккаунта.",
                text_en: "⚡ If you issue a punishment, prepare proof: screenshot or video of the violation. Only server administration can request evidence.\n\n• Mitigation of punishments is allowed, but not less than half the term specified in the rules.\n• Ignorance of the rules does not excuse you from liability. By joining our servers, you automatically agree to these terms.\n• Ban or rank removal appeals must be submitted within 1 day.\n• Account owners are solely responsible for actions performed on their account.",
                text_uk: "⚡ Якщо видаєте покарання, приготуйте докази: скріншот або відео порушення. Запросити докази може тільки адміністрація.\n\n• Можливе пом'якшення покарань, але не менше половини зазначеного в правилах терміну.\n• Незнання правил не звільняє від відповідальності. Почавши грати, Ви автоматично погоджуєтеся з цими правилами.\n• Термін подачі апеляції на бан / зняття донату становить 1 день.\n• Відповідальність за порушення несе виключно власник акаунта."
            },
            cat_1: {
                title_ru: "Чат и общение", title_en: "Chat & Communication", title_uk: "Чат та спілкування",
                text_ru: "1.0 Любые оскорбления, использование нецензурной лексики, упоминание запрещённых веществ или затрагивание родных.\nНаказание: 1 раз — мут 1 час, 2 раз — мут 1 день.\n\n1.1 Реклама или упоминание сторонних ресурсов и серверов.\nНаказание: бан от 30 дней.\n\n1.2 Спам, флуд, капс, транслит.\nНаказание: 1 раз — мут 10 мин, 2 раз — мут 30 мин, 3 раз — мут 1 час.\n\n1.3 Угрозы в реальной жизни, вымогательство или шантаж.\nНаказание: 1 раз — мут 6 часов, 2 раз — бан от 7 дней.\n\n1.4 Разжигание межнациональных конфликтов и политические дискуссии.\nНаказание: 1 раз — мут 1 час, 2 раз — бан 1 день, 3 раз — бан 7 дней.\n\n1.5 Распространение информации о багах, дюпах или читах.\nНаказание: бан от 14 дней.\n\n1.6 Деанонимизация и слив личных данных других игроков.\nНаказание: бан 30 дней + понижение привилегии.",
                text_en: "1.0 Any insults, profanity, illicit substance mentions or harassment of relatives.\nPunishment: 1st time — 1h mute, 2nd time — 1d mute.\n\n1.1 Advertising third-party resources or servers.\nPunishment: ban from 30 days.\n\n1.2 Spam, flood, excessive caps, translit.\nPunishment: 1st time — 10m mute, 2nd time — 30m mute, 3rd time — 1h mute.\n\n1.3 Real-life threats, extortion, or blackmail.\nPunishment: 1st time — 6h mute, 2nd time — ban from 7 days.\n\n1.4 Inciting conflicts or discussing politics.\nPunishment: 1st time — 1h mute, 2nd time — 1d ban, 3rd time — 7d ban.\n\n1.5 Sharing bugs, dupes, or cheat exploits.\nPunishment: ban from 14 days.\n\n1.6 Doxxing or sharing private personal data.\nPunishment: 30d ban + rank demotion.",
                text_uk: "1.0 Будь-які образи, нецензурна лексика, згадування заборонених речовин або зачіпання рідних.\nПокарання: 1 раз — мут 1 година, 2 раз — мут 1 день.\n\n1.1 Реклама або згадування сторонніх ресурсів та серверів.\nПокарання: бан від 30 днів.\n\n1.2 Спам, флуд, капс, трансліт.\nПокарання: 1 раз — мут 10 хв, 2 раз — мут 30 хв, 3 раз — мут 1 година.\n\n1.3 Погрози у реальному житті, здирництво або шантаж.\nПокарання: 1 раз — мут 6 годин, 2 раз — бан від 7 днів.\n\n1.4 Розпалювання міжнаціональних конфліктів та політика.\nПокарання: 1 раз — мут 1 година, 2 раз — бан 1 день, 3 раз — бан 7 днів.\n\n1.5 Поширення інформації про баги, дюпи або чити.\nПокарання: бан від 14 днів.\n\n1.6 Деанонімізація та злив особистих даних інших гравців.\nПокарання: бан 30 днів + зниження привілею."
            },
            cat_2: {
                title_ru: "Игровой процесс", title_en: "Gameplay & Mechanics", title_uk: "Ігровий процес",
                text_ru: "2.0 Гриферство с использованием донатерских команд.\nНаказание: снятие привилегии, снос построек или бан 1-7 дней.\n\n2.1 Обман игроков при торговле или обман администрации.\nНаказание: бан 14 дней + понижение привилегии.\n\n2.2 Постройка непристойных сооружений или запрещенной символики.\nНаказание: бан 7 дней + снятие привилегии.\n\n2.3 Блокировка доступа к чужим регионам и постройкам.\nНаказание: бан от 3 до 7 дней.\n\n2.4 Использование читов, читерских текстур, макросов, автокликеров и ботов.\nНаказание: вечный бан + снятие привилегии.\n\n2.5 Оскорбительное название клана.\nНаказание: удаление клана + бан лидера на 30 дней.\n\n2.6 Токсичное и деструктивное поведение клана.\nНаказание: расформирование клана + бан создателя на 3 месяца.",
                text_en: "2.0 Griefing using donor privilege commands.\nPunishment: rank removal, structure reset or 1-7d ban.\n\n2.1 Scamming players during trades or deceiving staff.\nPunishment: 14d ban + rank demotion.\n\n2.2 Constructing offensive structures or hate symbols.\nPunishment: 7d ban + rank removal.\n\n2.3 Blocking access to other players' regions or homes.\nPunishment: ban from 3 to 7 days.\n\n2.4 Using cheats, hacked clients, macros, autoclickers, or bots.\nPunishment: permanent ban + rank removal.\n\n2.5 Inappropriate or offensive clan name.\nPunishment: clan deletion + leader banned for 30 days.\n\n2.6 Toxic and destructive clan behavior.\nPunishment: clan disbanded + leader banned for 3 months.",
                text_uk: "2.0 Гриферство з використанням донатерських команд.\nПокарання: зняття привілею, знесення будівель або бан 1-7 днів.\n\n2.1 Обман гравців під час торгівлі або обман адміністрації.\nПокарання: бан 14 днів + зниження привілею.\n\n2.2 Побудова непристойних споруд або забороненої символіки.\nПокарання: бан 7 днів + зняття привілею.\n\n2.3 Блокування доступу до чужих регіонів та будівель.\nПокарання: бан від 3 до 7 днів.\n\n2.4 Використання читів, читерських текстур, макросів, автоклікерів та ботів.\nПокарання: вічний бан + зняття привілею.\n\n2.5 Образлива назва клану.\nПокарання: видалення клану + бан лідера на 30 днів.\n\n2.6 Токсична та деструктивна поведінка клану.\nПокарання: розформування клану + бан творця на 3 місяці."
            },
            cat_3: {
                title_ru: "Аккаунты и скины", title_en: "Accounts & Skins", title_uk: "Акаунти та скіни",
                text_ru: "3.0 Регистрация более 3 аккаунтов на одного игрока.\nНаказание: вечный бан всех твинков.\n\n3.1 Оскорбительный никнейм или ник, похожий на ники администрации.\nНаказание: вечный бан аккаунта.\n\n3.2 Невидимый или микро-скин, дающий нечестное преимущество в PvP.\nНаказание: бан 30 минут.\n\n3.3 Скин, содержащий оскорбительную или нацистскую символику.\nНаказание: кик, при повторе — бан 7 дней.",
                text_en: "3.0 Registering more than 3 accounts per player.\nPunishment: permanent ban of all alts.\n\n3.1 Offensive nickname or impersonating server staff.\nPunishment: permanent ban.\n\n3.2 Invisible or micro-hitbox skins giving unfair PvP advantage.\nPunishment: 30m ban.\n\n3.3 Skins with offensive or hate-related imagery.\nPunishment: kick, repeat: 7d ban.",
                text_uk: "3.0 Реєстрація більше 3 акаунтів на одного гравця.\nПокарання: вічний бан усіх твінків.\n\n3.1 Образливий нікнейм або нік, схожий на ніки адміністрації.\nПокарання: вічний бан акаунта.\n\n3.2 Невидимий або мікро-скін, що дає нечесну перевагу в PvP.\nПокарання: бан 30 хвилин.\n\n3.3 Скін, що містить образливу або нацистську символіку.\nПокарання: кік, при повторі — бан 7 днів."
            },
            cat_4: {
                title_ru: "Правила для Донатеров", title_en: "Donor Conduct Rules", title_uk: "Правила для Донатерів",
                text_ru: "4.0 Выдача наказаний игрокам без доказательств нарушения или злоупотребление правами.\nНаказание: 1 раз — бан 7 дней, 2 раз — понижение привилегии, 3 раз — снятие доната.\n\n4.1 Снятие наказания с нарушителя без объективной причины.\nНаказание: 1 раз — предупреждение, 2 раз — бан 1 день, 3 раз — понижение привилегии.\n\n4.2 Оскорбительная причина наказания в командах /ban, /mute, /kick.\nНаказание: бан 7 дней + понижение привилегии.\n\n4.3 Установка префикса, вводящего в заблуждение (например: «Админ», «Основатель»).\nНаказание: бан 5 дней + понижение привилегии.",
                text_en: "4.0 Punishing players without proof or abusing privileges.\nPunishment: 1st time — 7d ban, 2nd time — rank demotion, 3rd time — rank removal.\n\n4.1 Unmuting or unbanning a rule breaker without valid reason.\nPunishment: 1st time — warning, 2nd time — 1d ban, 3rd time — rank demotion.\n\n4.2 Profanity or insults in ban/mute/kick reason.\nPunishment: 7d ban + rank demotion.\n\n4.3 Setting misleading chat prefix (e.g., 'Admin', 'Owner', 'Helper').\nPunishment: 5d ban + rank demotion.",
                text_uk: "4.0 Видача покарань без доказів або зловживання правами.\nПокарання: 1 раз — бан 7 днів, 2 раз — зниження привілею, 3 раз — зняття донату.\n\n4.1 Зняття покарання з порушника без об'єктивної причини.\nПокарання: 1 раз — попередження, 2 раз — бан 1 день, 3 раз — зниження привілею.\n\n4.2 Образлива причина покарання в командах /ban, /mute, /kick.\nПокарання: бан 7 днів + зниження привілею.\n\n4.3 Встановлення префікса, що вводить в оману (наприклад: «Адмін», «Засновник»).\nПокарання: бан 5 днів + зниження привілею."
            }
        };
    }
}

class SkinViewerService {
    static viewer = null;
    static currentAnimation = null;
    static currentNick = 'Sony';

    static init(bus, locale) {
        const canvas = document.getElementById('skin-canvas');
        if (!canvas) return;

        const inputNick = document.getElementById('skin-input-nick');
        const searchBtn = document.getElementById('skin-search-btn');
        const downloadBtn = document.getElementById('skin-download-btn');
        const rotateToggle = document.getElementById('skin-toggle-rotate');
        const loader = document.getElementById('skin-loading');

        const init3D = () => {
            if (window.skinview3d && !this.viewer) {
                try {
                    const width = canvas.parentElement.clientWidth || 300;
                    const height = canvas.parentElement.clientHeight || 340;

                    this.viewer = new skinview3d.SkinViewer({
                        canvas: canvas,
                        width: width,
                        height: height,
                        skin: `https://mc-heads.net/skin/${encodeURIComponent(this.currentNick)}`
                    });

                    this.viewer.camera.position.set(0, 10, 40);
                    this.viewer.controls.enableRotate = true;
                    this.viewer.controls.enableZoom = true;
                    this.viewer.controls.enablePan = false;
                    this.viewer.autoRotate = rotateToggle ? rotateToggle.checked : true;
                    this.viewer.autoRotateSpeed = 0.8;

                    this.setAnimation('walk');
                } catch (e) {}
            }
        };

        if (window.skinview3d) {
            init3D();
        } else {
            window.addEventListener('load', () => {
                if (window.skinview3d && !this.viewer) init3D();
            });
        }

        bus.on('tabChanged', ({ target }) => {
            if (target === 'skin-viewer') {
                if (!this.viewer && window.skinview3d) {
                    init3D();
                } else if (this.viewer) {
                    const w = canvas.parentElement.clientWidth || 300;
                    const h = canvas.parentElement.clientHeight || 340;
                    this.viewer.setSize(w, h);
                }
            }
        });

        const loadSkin = async (nick) => {
            if (!nick) return;
            this.currentNick = nick.trim();
            if (loader) loader.style.display = 'block';

            const skinUrl = `https://mc-heads.net/skin/${encodeURIComponent(this.currentNick)}`;

            if (this.viewer) {
                try {
                    await this.viewer.loadSkin(skinUrl);
                } catch (err) {}
            }
            if (loader) loader.style.display = 'none';
        };

        if (downloadBtn) {
            downloadBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                SoundFXService.playClick();
                ToastService.show('Загрузка скина...');
                try {
                    const skinUrl = `https://mc-heads.net/skin/${encodeURIComponent(this.currentNick)}`;
                    const res = await fetch(skinUrl);
                    if (!res.ok) throw new Error('Network error');
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = blobUrl;
                    a.download = `${this.currentNick}_skin.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
                    ToastService.show('Скин успешно скачан!');
                } catch (err) {
                    if (canvas && typeof canvas.toDataURL === 'function') {
                        try {
                            const canvasUrl = canvas.toDataURL('image/png');
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = canvasUrl;
                            a.download = `${this.currentNick}_3d.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            ToastService.show('Скин успешно скачан!');
                            return;
                        } catch (e2) {}
                    }
                    window.open(`https://mc-heads.net/skin/${encodeURIComponent(this.currentNick)}`, '_blank');
                }
            });
        }

        if (searchBtn && inputNick) {
            searchBtn.addEventListener('click', () => {
                SoundFXService.playClick();
                document.querySelectorAll('[data-preset]').forEach(c => c.classList.remove('active'));
                loadSkin(inputNick.value);
            });

            inputNick.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    SoundFXService.playClick();
                    document.querySelectorAll('[data-preset]').forEach(c => c.classList.remove('active'));
                    loadSkin(inputNick.value);
                }
            });
        }

        document.querySelectorAll('[data-preset]').forEach(chip => {
            chip.addEventListener('click', (e) => {
                SoundFXService.playClick();
                document.querySelectorAll('[data-preset]').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const presetNick = e.currentTarget.dataset.preset;
                if (inputNick) inputNick.value = presetNick;
                loadSkin(presetNick);
            });
        });

        const animMap = {
            'skin-anim-walk': 'walk',
            'skin-anim-run': 'run',
            'skin-anim-fly': 'fly',
            'skin-anim-idle': 'idle',
            'skin-anim-pause': 'pause'
        };

        Object.keys(animMap).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    SoundFXService.playClick();
                    document.querySelectorAll('.mc-skin-quick-actions .mc-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.setAnimation(animMap[btnId]);
                });
            }
        });

        if (rotateToggle) {
            rotateToggle.addEventListener('change', () => {
                if (this.viewer) {
                    this.viewer.autoRotate = rotateToggle.checked;
                }
            });
        }

        loadSkin(this.currentNick);
    }

    static setAnimation(type) {
        if (!this.viewer || !window.skinview3d) return;

        try {
            if (type === 'pause') {
                if (this.viewer.animations) this.viewer.animations.paused = true;
                if (this.viewer.animation) this.viewer.animation.paused = true;
                return;
            }

            let animClass = null;
            let speed = 0.8;

            if (type === 'walk' && skinview3d.WalkingAnimation) {
                animClass = skinview3d.WalkingAnimation;
                speed = 0.8;
            } else if (type === 'run' && skinview3d.RunningAnimation) {
                animClass = skinview3d.RunningAnimation;
                speed = 1.0;
            } else if (type === 'fly' && skinview3d.FlyingAnimation) {
                animClass = skinview3d.FlyingAnimation;
                speed = 0.9;
            } else if (type === 'idle' && skinview3d.IdleAnimation) {
                animClass = skinview3d.IdleAnimation;
                speed = 0.6;
            }

            if (animClass) {
                if (this.viewer.animations && typeof this.viewer.animations.add === 'function') {
                    if (this.currentAnimation) {
                        this.currentAnimation.paused = true;
                    }
                    this.currentAnimation = this.viewer.animations.add(animClass);
                    this.currentAnimation.speed = speed;
                    this.viewer.animations.paused = false;
                } else if ('animation' in this.viewer) {
                    this.viewer.animation = new animClass();
                    this.viewer.animation.speed = speed;
                    this.viewer.animation.paused = false;
                }
            }
        } catch (e) {}
    }
}

class AppCore {
    static init() {
        SoundFXService.init();
        ToastService.init();
        new ParticleEngine('mc-particles');

        const translations = {
            ru: {
                title: "AézaMine — Топ Сервер Майнкрафт Бедрок / Minecraft Bedrock PE",
                add_server: "Добавить сервер",
                servers: "Серверы",
                servers_desc: "Мониторинг игровых серверов AézaMine в режиме реального времени",
                online_server: "онлайн игроков",
                survival: "Выживание+",
                description: "Надёжный сервер<br>Майнкрафт Бедрок",
                description2: "Невероятное реально! Международный, мини-игры, выживание, кланы, свадьбы и не только на сервере АéзаМайн.",
                server_ip_label: "IP ДЛЯ ПОДКЛЮЧЕНИЯ:",
                copy_ip_btn: "Скопировать IP",
                quick_join_btn: "В игру",
                ip_copied: "IP скопирован в буфер обмена!",
                buy_title: "Покупка доната",
                buy_description: "Поддержите проект и получите уникальные возможности и привилегии навсегда.",
                buy_sum: "от 49₽",
                buy_sub_sum: "навсегда",
                info2: "Главная",
                video_title: "Много возможностей",
                video_description: "120+ команд, мини-игры, играйте без задержек. 24/7 поддержка и уникальные функции, ощутите полную свободу и наслаждайтесь контентом.",
                news_tab: "Новости",
                news_subtitle: "Свежие обновления, вайпы и ивенты из нашего официального Telegram-канала",
                load_more: "Загрузить ещё новости",
                open_tg_channel: "Канал в Telegram",
                ranks_desc_tab: "Привилегии",
                ranks_desc_title: "Описание донат привилегий",
                ranks_desc_sub: "Выберите привилегию, чтобы узнать все её команды, лимиты и возможности на сервере.",
                rank_view_cards: "Карточки",
                rank_view_compare: "Сравнение",
                compare_rank_a: "Привилегия 1:",
                compare_rank_b: "Привилегия 2:",
                compare_feature: "Параметр",
                compare_rg_blocks: "Размер региона (Блоков)",
                compare_commands: "Основные команды",
                rank_lbl_rg: "Регионы",
                rank_lbl_homes: "Точки дома",
                rank_lbl_warps: "Варпы",
                rank_lbl_saveinv: "Сохранение",
                rank_lbl_bans: "Срок бана",
                rank_lbl_hp: "Здоровье",
                rank_lbl_xp: "Множитель опыта",
                rank_btn_details: "Возможности",
                rank_btn_buy: "Купить привилегию",
                rank_sec_stats: "Характеристики и лимиты",
                rank_sec_cmds: "Команды и возможности",
                rank_sec_other: "Особые возможности",
                skin_viewer_tab: "3D Скины",
                skin_viewer_desc: "Интерактивный 3D-рендер скина игрока с анимациями ходьбы, бега и свободным вращением.",
                skin_search_title: "Поиск по никнейму",
                skin_btn_show: "Показать",
                skin_presets_title: "Популярные скины:",
                skin_auto_rotate: "Авто-вращение камеры",
                skin_download_btn: "Скачать скин",
                skin_anim_walk: "Ходьба",
                skin_anim_run: "Бег",
                skin_anim_fly: "Полёт",
                skin_anim_idle: "Стойка",
                skin_anim_pause: "Пауза",
                rules_tab: "Правила",
                rules_subtitle: "Официальные правила игровых серверов AézaMine",
                staff_tab: "Команда",
                staff_heart: "Наша команда — сердце проекта",
                staff_desc: "Благодаря им на серверах царит порядок и дружелюбная атмосфера.",
                rank_ADMIN: "Администраторы",
                rank_HELPER: "Помощники",
                staff_act: "Активность",
                staff_warns: "Выговоры",
                staff_since: "В команде с",
                month_1: "января", month_2: "февраля", month_3: "марта", month_4: "апреля",
                month_5: "мая", month_6: "июня", month_7: "июля", month_8: "августа",
                month_9: "сентября", month_10: "октября", month_11: "ноября", month_12: "декабря",
                tg_ru: "Telegram",
                tg_en: "Telegram (EN)",
                add_server_dialog_title: "ДОБАВИТЬ НОВЫЙ СЕРВЕР",
                lbl_server_name: "Имя сервера",
                lbl_server_address: "Адрес сервера",
                lbl_server_port: "Порт",
                btn_copy_server: "Скопировать",
                btn_add_and_play: "Добавить и играть",
                how_to_play_title: "📖 Как начать играть",
                step_1_title: "1. Запуск игры",
                step_1_desc: "Запустите Minecraft Bedrock (1.20 - 1.26+) на телефоне или ПК.",
                step_2_title: "2. Меню серверов",
                step_2_desc: "Нажмите «Играть» ➔ вкладка «Серверы» ➔ «Добавить сервер».",
                step_3_title: "3. Ввод данных",
                step_3_desc: "Введите aezamine.com и порт 19132 (или нажмите зелёную кнопку).",
                step_4_title: "4. Приятной игры",
                step_4_desc: "Нажмите «Играть» или «Сохранить» и заходите на сервер сразу без регистрации!",
                server_copied_toast: "IP и порт скопированы (aezamine.com:19132)!",
                server_status_online: "🟢 СЕРВЕР ОНЛАЙН",
                server_mode_title: "Выживание+"
            },
            uk: {
                title: "AézaMine — Топ Сервер Майнкрафт Бедрок / Minecraft Bedrock PE",
                add_server: "Додати сервер",
                servers: "Сервери",
                servers_desc: "Моніторинг ігрових серверів AézaMine у режимі реального часу",
                online_server: "онлайн гравців",
                survival: "Виживання+",
                description: "Надійний сервер<br>Майнкрафт Бедрок",
                description2: "Неймовірне реально! Міжнародний, міні-ігри, виживання, клани, весілля та не тільки на сервері АéзаМайн.",
                server_ip_label: "IP ДЛЯ ПІДКЛЮЧЕННЯ:",
                copy_ip_btn: "Скопіювати IP",
                quick_join_btn: "У гру",
                ip_copied: "IP скопійовано в буфер обміну!",
                buy_title: "Купівля донату",
                buy_description: "Підтримайте проєкт та отримайте унікальні можливості та привілеї назавжди.",
                buy_sum: "від 20₴",
                buy_sub_sum: "назавжди",
                info2: "Головна",
                video_title: "Багато можливостей",
                video_description: "120+ команд, міні-ігри, грайте без затримок. 24/7 підтримка та унікальні функції, відчуйте повну свободу та насолоджуйтесь контентом.",
                isp_title: "Переходіть на швидкісний інтернет!",
                isp_desc: "Перехід зі збереженням номера безкоштовно!",
                news_tab: "Новини",
                news_subtitle: "Свіжі оновлення, вайпи та івенти з нашого official Telegram-каналу",
                load_more: "Завантажити ще новини",
                open_tg_channel: "Канал у Telegram",
                ranks_desc_tab: "Привілеї",
                ranks_desc_title: "Опис донат привілеїв",
                ranks_desc_sub: "Оберіть привілей, щоб дізнатися всі його команди, ліміти та можливості на сервері.",
                rank_view_cards: "Картки",
                rank_view_compare: "Порівняння",
                compare_rank_a: "Привілей 1:",
                compare_rank_b: "Привілей 2:",
                compare_feature: "Параметр",
                compare_rg_blocks: "Розмір регіону (Блоків)",
                compare_commands: "Основні команди",
                rank_lbl_rg: "Регіони",
                rank_lbl_homes: "Точки дому",
                rank_lbl_warps: "Варпи",
                rank_lbl_saveinv: "Збереження",
                rank_lbl_bans: "Термін бану",
                rank_lbl_hp: "Здоров'я",
                rank_lbl_xp: "Множник досвіду",
                rank_btn_details: "Можливості",
                rank_btn_buy: "Купити привілей",
                rank_sec_stats: "Характеристики та ліміти",
                rank_sec_cmds: "Команди та можливості",
                rank_sec_other: "Особливі можливості",
                skin_viewer_tab: "3D Скіни",
                skin_viewer_desc: "Інтерактивний 3D-рендер скіна гравця з анімаціями ходьби, бігу та вільним обертанням.",
                skin_search_title: "Пошук за нікнеймом",
                skin_btn_show: "Показати",
                skin_presets_title: "Популярні скіни:",
                skin_auto_rotate: "Авто-обертання камери",
                skin_download_btn: "Завантажити скін",
                skin_anim_walk: "Ходьба",
                skin_anim_run: "Біг",
                skin_anim_fly: "Політ",
                skin_anim_idle: "Стійка",
                skin_anim_pause: "Пауза",
                rules_tab: "Правила",
                rules_subtitle: "Офіційні правила ігрових серверів AézaMine",
                staff_tab: "Команда",
                staff_heart: "Наша команда — серце проєкту",
                staff_desc: "Завдяки їм на серверах панує порядок і дружня атмосфера.",
                rank_ADMIN: "Адміністратори",
                rank_HELPER: "Помічники",
                staff_act: "Активність",
                staff_warns: "Догани",
                staff_since: "У команді з",
                month_1: "січня", month_2: "лютого", month_3: "березня", month_4: "квітня",
                month_5: "травня", month_6: "червня", month_7: "липня", month_8: "серпня",
                month_9: "вересня", month_10: "жовтня", month_11: "листопада", month_12: "грудня",
                tg_ru: "Telegram",
                tg_en: "Telegram (EN)",
                add_server_dialog_title: "ДОДАТИ НОВИЙ СЕРВЕР",
                lbl_server_name: "Ім'я сервера",
                lbl_server_address: "Адреса сервера",
                lbl_server_port: "Порт",
                btn_copy_server: "Скопіювати",
                btn_add_and_play: "Додати і грати",
                how_to_play_title: "📖 Як почати грати",
                step_1_title: "1. Запуск гри",
                step_1_desc: "Запустіть Minecraft Bedrock (1.20 - 1.26+) на телефоні або ПК.",
                step_2_title: "2. Меню серверів",
                step_2_desc: "Натисніть «Грати» ➔ вкладка «Сервери» ➔ «Додати сервер».",
                step_3_title: "3. Введення даних",
                step_3_desc: "Введіть aezamine.com та порт 19132 (або натисніть зелену кнопку).",
                step_4_title: "4. Приємної гри",
                step_4_desc: "Натисніть «Грати» або «Зберегти» та заходьте на сервер одразу без реєстрації!",
                server_copied_toast: "IP та порт скопійовано (aezamine.com:19132)!",
                server_status_online: "🟢 СЕРВЕР ОНЛАЙН",
                server_mode_title: "Виживання+"
            },
            en: {
                title: "AézaMine — Top Minecraft Bedrock Server / Minecraft PE",
                add_server: "Add Server",
                servers: "Servers",
                servers_desc: "Real-time monitoring of AézaMine game servers",
                online_server: "online players",
                survival: "Survival+",
                description: "Reliable Server<br>Minecraft Bedrock",
                description2: "The incredible is real! International, mini-games, survival, clans, weddings and more on AézaMine.",
                server_ip_label: "CONNECTION IP:",
                copy_ip_btn: "Copy IP",
                quick_join_btn: "Play Now",
                ip_copied: "Server IP copied to clipboard!",
                buy_title: "Donate Store",
                buy_description: "Support the project and unlock exclusive perks and lifetime privileges.",
                buy_sum: "from 0.49€",
                buy_sub_sum: "forever",
                info2: "Home",
                video_title: "Unlimited Possibilities",
                video_description: "120+ commands, mini-games, low latency. 24/7 support and unique features for complete freedom.",
                news_tab: "News",
                news_subtitle: "Latest updates, wipes, and events from our official Telegram channel",
                load_more: "Load More News",
                open_tg_channel: "Telegram Channel",
                ranks_desc_tab: "Privileges",
                ranks_desc_title: "Donate Ranks & Privileges",
                ranks_desc_sub: "Select a rank to inspect all its commands, limits, and server features.",
                rank_view_cards: "Cards",
                rank_view_compare: "Comparison",
                compare_rank_a: "Rank 1:",
                compare_rank_b: "Rank 2:",
                compare_feature: "Feature",
                compare_rg_blocks: "Region Max Blocks",
                compare_commands: "Main Commands",
                rank_lbl_rg: "Regions",
                rank_lbl_homes: "Homes",
                rank_lbl_warps: "Warps",
                rank_lbl_saveinv: "Save Inv",
                rank_lbl_bans: "Max Ban",
                rank_lbl_hp: "Health",
                rank_lbl_xp: "XP Multiplier",
                rank_btn_details: "Features",
                rank_btn_buy: "Buy Rank",
                rank_sec_stats: "Stats & Limits",
                rank_sec_cmds: "Commands & Privileges",
                rank_sec_other: "Special Perks",
                skin_viewer_tab: "3D Skins",
                skin_viewer_desc: "Interactive 3D Minecraft player skin viewer with walk, run, fly animations and free orbit.",
                skin_search_title: "Search by Nickname",
                skin_btn_show: "Render",
                skin_presets_title: "Popular Skins:",
                skin_auto_rotate: "Camera Auto-Rotate",
                skin_download_btn: "Download Skin",
                skin_anim_walk: "Walk",
                skin_anim_run: "Run",
                skin_anim_fly: "Fly",
                skin_anim_idle: "Idle",
                skin_anim_pause: "Pause",
                rules_tab: "Rules",
                rules_subtitle: "Official AézaMine Server Rules",
                staff_tab: "Staff",
                staff_heart: "Our Staff is the Heart of the Project",
                staff_desc: "Thanks to them, the servers maintain order and a friendly atmosphere.",
                rank_ADMIN: "Administrators",
                rank_HELPER: "Helpers",
                staff_act: "Activity",
                staff_warns: "Warnings",
                staff_since: "On team since",
                month_1: "January", month_2: "February", month_3: "March", month_4: "April",
                month_5: "May", month_6: "June", month_7: "July", month_8: "August",
                month_9: "September", month_10: "October", month_11: "November", month_12: "December",
                tg_ru: "Telegram (RU)",
                tg_en: "Telegram",
                add_server_dialog_title: "ADD NEW SERVER",
                lbl_server_name: "Server Name",
                lbl_server_address: "Server Address",
                lbl_server_port: "Port",
                btn_copy_server: "Copy",
                btn_add_and_play: "Add & Play",
                how_to_play_title: "📖 How to Start Playing",
                step_1_title: "1. Launch Game",
                step_1_desc: "Open Minecraft Bedrock (1.20 - 1.26+) on mobile or PC.",
                step_2_title: "2. Servers Menu",
                step_2_desc: "Click 'Play' ➔ switch to 'Servers' tab ➔ click 'Add Server'.",
                step_3_title: "3. Enter Details",
                step_3_desc: "Enter aezamine.com and port 19132 (or click green button).",
                step_4_title: "4. Enjoy Playing",
                step_4_desc: "Click 'Play' or 'Save' and join the server instantly without registration!",
                server_copied_toast: "IP & Port copied (aezamine.com:19132)!",
                server_status_online: "🟢 SERVER ONLINE",
                server_mode_title: "Survival+"
            }
        };

        const bus = new EventBus();
        const locale = new LocalizationEngine(translations, bus);
        const ui = new UIController(bus, locale);

        const bedrockCopyBtn = document.getElementById('btn-bedrock-copy');
        if (bedrockCopyBtn) {
            bedrockCopyBtn.addEventListener('click', async () => {
                SoundFXService.playClick();
                try {
                    await navigator.clipboard.writeText('aezamine.com:19132');
                    ToastService.show(locale.get('server_copied_toast', 'IP и порт скопированы (aezamine.com:19132)!'));
                } catch (e) {
                    ToastService.show('aezamine.com:19132');
                }
            });
        }

        ['bedrock-name-box', 'bedrock-ip-box', 'bedrock-port-box'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', async () => {
                    SoundFXService.playClick();
                    try {
                        await navigator.clipboard.writeText(el.textContent.trim());
                        ToastService.show(`${el.textContent.trim()} скопировано!`);
                    } catch (e) {}
                });
            }
        });

        StaffService.init(bus, locale);
        RanksService.init(bus, locale);
        RulesService.init(bus, locale);
        SkinViewerService.init(bus, locale);
        new TelegramNewsService(bus, locale);

        new ServerMonitorService({
            endpoint: 'https://api.mcsrvstat.us/bedrock/3/aezamine.com:',
            port: 19132,
            interval: 30000
        }, bus, locale);

        locale.setLanguage(locale.current);

        if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AppCore.init();
    });
} else {
    AppCore.init();
}
