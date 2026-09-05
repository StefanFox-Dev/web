import { appStore } from './state';
export class PlayerTranslate {
    static translations = {
        ru: {
            'title': 'AézaMine — Топ Сервер Майнкрафт Бедрок',
            'info2': 'Главная',
            'news_tab': 'Новости',
            'buy_title': 'Донат',
            'ranks_desc_tab': 'Привилегии',
            'skin_viewer_tab': '3D Скины',
            'rules_tab': 'Правила',
            'staff_tab': 'Команда',
            'description': 'Надёжный сервер<br>Майнкрафт Бедрок',
            'description2': 'Невероятное реально! Международный, мини-игры, выживание, кланы, свадьбы и не только на сервере АéзаМайн.',
            'server_status_online': '🟢 СЕРВЕР ОНЛАЙН',
            'server_status_offline': '🔴 ТЕХРАБОТЫ',
            'server_mode_title': 'Выживание+',
            'online_server': 'онлайн игроков',
            'video_title': 'Много возможностей',
            'video_description': '120+ команд, мини-игры, играйте без задержек. 24/7 поддержка и уникальные функции, ощутите полную свободу и наслаждайтесь контентом.',
            'btn_copy_ip': 'Скопировать IP',
            'btn_buy_rank': 'Купить привилегию',
            'ip_copied': 'IP адрес aezamine.com успешно скопирован!',
            'port_label': 'Порт: 19132',
            'search_rules_placeholder': 'Поиск по правилам...',
            'calculate_upgrade': 'Рассчитать доплату',
            'enter_nick': 'Введите игровой ник'
        },
        uk: {
            'title': 'AézaMine — Топ Сервер Майнкрафт Бедрок',
            'info2': 'Головна',
            'news_tab': 'Новини',
            'buy_title': 'Донат',
            'ranks_desc_tab': 'Привілеї',
            'skin_viewer_tab': '3D Скіни',
            'rules_tab': 'Правила',
            'staff_tab': 'Команда',
            'description': 'Надійний сервер<br>Майнкрафт Бедрок',
            'description2': 'Неймовірне реально! Міжнародний, міні-ігри, виживання, клани, весілля та не тільки на сервері АéзаМайн.',
            'server_status_online': '🟢 СЕРВЕР ОНЛАЙН',
            'server_status_offline': '🔴 ТЕХНІЧНІ РОБОТИ',
            'server_mode_title': 'Виживання+',
            'online_server': 'онлайн гравців',
            'video_title': 'Багато можливостей',
            'video_description': '120+ команд, міні-ігри, грайте без затримок. 24/7 підтримка та унікальні функції, відчуйте повну свободу та насолоджуйтеся грою.',
            'btn_copy_ip': 'Скопіювати IP',
            'btn_buy_rank': 'Придбати привілей',
            'ip_copied': 'IP адресу aezamine.com успішно скопійовано!',
            'port_label': 'Порт: 19132',
            'search_rules_placeholder': 'Пошук по правилах...',
            'calculate_upgrade': 'Розрахувати доплату',
            'enter_nick': 'Введіть ігровий нікнейм'
        },
        en: {
            'title': 'AézaMine — Top Minecraft Bedrock Server',
            'info2': 'Home',
            'news_tab': 'News',
            'buy_title': 'Shop',
            'ranks_desc_tab': 'Privileges',
            'skin_viewer_tab': '3D Skins',
            'rules_tab': 'Rules',
            'staff_tab': 'Staff',
            'description': 'Reliable Bedrock<br>Minecraft Server',
            'description2': 'Incredible is real! International, mini-games, survival, clans, marriages and much more on AezaMine.',
            'server_status_online': '🟢 SERVER ONLINE',
            'server_status_offline': '🔴 MAINTENANCE',
            'server_mode_title': 'Survival+',
            'online_server': 'online players',
            'video_title': 'Limitless Features',
            'video_description': '120+ commands, mini-games, lag-free gameplay. 24/7 support and unique custom mechanics.',
            'btn_copy_ip': 'Copy IP',
            'btn_buy_rank': 'Purchase Rank',
            'ip_copied': 'Server IP aezamine.com successfully copied!',
            'port_label': 'Port: 19132',
            'search_rules_placeholder': 'Search rules...',
            'calculate_upgrade': 'Calculate upgrade',
            'enter_nick': 'Enter player nickname'
        }
    };
    static translate(key, ...params) {
        const lang = appStore.getState().language;
        const dict = this.translations[lang] || this.translations.ru;
        let text = dict[key] || this.translations.ru[key] || key;
        for (let i = 0; i < params.length; i++) {
            text = text.replace(new RegExp(`\\{${i}\\}`, 'g'), String(params[i]));
        }
        return text;
    }
    static setLanguage(lang) {
        appStore.setState({ language: lang });
        this.updateDom();
    }
    static toggleLanguage() {
        const current = appStore.getState().language;
        const next = current === 'ru' ? 'uk' : current === 'uk' ? 'en' : 'ru';
        this.setLanguage(next);
    }
    static updateDom() {
        const elements = document.querySelectorAll('[lang]');
        for (const el of elements) {
            const key = el.getAttribute('lang');
            if (key && key !== 'title') {
                const text = this.translate(key);
                if (text.includes('<br>')) {
                    el.innerHTML = text;
                }
                else {
                    el.textContent = text;
                }
            }
        }
        const docTitle = this.translate('title');
        if (docTitle) {
            document.title = docTitle;
        }
        const langBtn = document.getElementById('lang-change');
        if (langBtn) {
            langBtn.textContent = appStore.getState().language.toUpperCase();
        }
    }
}
//# sourceMappingURL=i18n.js.map