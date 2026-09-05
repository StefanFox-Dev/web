export type SupportedLanguage = 'ru' | 'uk' | 'en';

export class PlayerTranslate {
  private static readonly dictionaries: Record<SupportedLanguage, Record<string, string>> = {
    ru: {
      'server.online': 'Сервер онлайн! Игроков: {0}/{1}',
      'server.offline': 'Сервер временно недоступен. Ведутся технические работы.',
      'server.ping_success': 'Успешное подключение к серверу Bedrock.',
      'server.healthy': 'Все внутренние подсистемы работают в штатном режиме.',
      'auth.required': 'Требуется авторизация администратора.',
      'auth.invalid': 'Предоставлен недействительный токен или пароль администратора.',
      'rcon.success': 'Команда RCON успешно выполнена.',
      'rcon.error': 'Ошибка выполнения команды RCON: {0}',
      'ranks.not_found': 'Запрошенная привилегия не найдена.',
      'ranks.calculated': 'Расчет доплаты успешно произведен.',
      'rules.not_found': 'Запрошенный раздел правил не найден.',
      'staff.not_found': 'Сотрудник администрации не найден.',
      'validation.failed': 'Ошибка валидации входных данных: {0}',
      'rate_limit.exceeded': 'Превышен лимит запросов. Пожалуйста, подождите {0} сек.'
    },
    uk: {
      'server.online': 'Сервер онлайн! Гравців: {0}/{1}',
      'server.offline': 'Сервер тимчасово недоступний. Тривають технічні роботи.',
      'server.ping_success': 'Успішне підключення до сервера Bedrock.',
      'server.healthy': 'Усі внутрішні підсистеми працюють у штатному режимі.',
      'auth.required': 'Потрібна авторизація адміністратора.',
      'auth.invalid': 'Надано недійсний токен або пароль адміністратора.',
      'rcon.success': 'Команда RCON успішно виконана.',
      'rcon.error': 'Помилка виконання команди RCON: {0}',
      'ranks.not_found': 'Запитуваний привілей не знайдено.',
      'ranks.calculated': 'Розрахунок доплати успішно виконано.',
      'rules.not_found': 'Запитуваний розділ правил не знайдено.',
      'staff.not_found': 'Співробітника адміністрації не знайдено.',
      'validation.failed': 'Помилка валідації вхідних даних: {0}',
      'rate_limit.exceeded': 'Перевищено ліміт запитів. Будь ласка, зачекайте {0} сек.'
    },
    en: {
      'server.online': 'Server is online! Players: {0}/{1}',
      'server.offline': 'Server is temporarily offline for maintenance.',
      'server.ping_success': 'Successfully pinged Bedrock server.',
      'server.healthy': 'All core subsystems are operating nominally.',
      'auth.required': 'Administrator authentication is required.',
      'auth.invalid': 'Invalid administrator token or password provided.',
      'rcon.success': 'RCON command executed successfully.',
      'rcon.error': 'RCON execution error: {0}',
      'ranks.not_found': 'Requested privilege rank was not found.',
      'ranks.calculated': 'Rank upgrade cost calculated successfully.',
      'rules.not_found': 'Requested rules category was not found.',
      'staff.not_found': 'Staff member was not found.',
      'validation.failed': 'Input validation failed: {0}',
      'rate_limit.exceeded': 'Rate limit exceeded. Please wait {0} seconds.'
    }
  };

  public static translate(lang: string | undefined, key: string, ...params: (string | number)[]): string {
    const targetLang: SupportedLanguage = this.normalizeLang(lang);
    const dict = this.dictionaries[targetLang] || this.dictionaries.ru;
    let template = dict[key] || this.dictionaries.ru[key] || this.dictionaries.en[key] || key;

    for (let i = 0; i < params.length; i++) {
      template = template.replace(new RegExp(`\\{${i}\\}`, 'g'), String(params[i]));
    }

    return template;
  }

  public static normalizeLang(rawLang?: string): SupportedLanguage {
    if (!rawLang) return 'ru';
    const lower = rawLang.toLowerCase().slice(0, 2);
    if (lower === 'uk' || lower === 'ua') return 'uk';
    if (lower === 'en') return 'en';
    return 'ru';
  }
}
