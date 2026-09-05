import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { RulesDocument, RuleCategory } from '../domain/types';
import { Logger } from '../core/logger';
import { PlayerTranslate, SupportedLanguage } from './translate-service';

export class RulesRepository {
  private readonly logger: Logger;
  private readonly possiblePaths: string[];
  private cache: RulesDocument | null = null;

  constructor(logger?: Logger) {
    this.logger = logger ? logger.child('RulesRepository') : new Logger('RulesRepository');
    this.possiblePaths = [
      resolve(process.cwd(), '../site/rules.json'),
      resolve(process.cwd(), 'site/rules.json'),
      resolve(process.cwd(), 'web/site/rules.json'),
      resolve(__dirname, '../../../../site/rules.json'),
      resolve(__dirname, '../../../site/rules.json')
    ];
  }

  private getFilePath(): string {
    for (const p of this.possiblePaths) {
      if (existsSync(p)) return p;
    }
    return this.possiblePaths[0]!;
  }

  public async getRawRules(): Promise<RulesDocument | null> {
    if (this.cache) return this.cache;

    const path = this.getFilePath();
    try {
      const data = await readFile(path, 'utf-8');
      const parsed: RulesDocument = JSON.parse(data);
      this.cache = parsed;
      return parsed;
    } catch (err) {
      this.logger.error(`Could not read rules.json from ${path}`, err instanceof Error ? err : undefined);
      return null;
    }
  }

  public async getLocalizedRules(langRaw?: string): Promise<Record<string, { title: string; text: string }>> {
    const lang: SupportedLanguage = PlayerTranslate.normalizeLang(langRaw);
    const doc = await this.getRawRules();
    if (!doc) return {};

    const result: Record<string, { title: string; text: string }> = {};

    for (const [key, value] of Object.entries(doc)) {
      if (key === 'info') {
        const infoVal = value as { text_ru: string; text_en: string; text_uk: string };
        result['info'] = {
          title: lang === 'uk' ? 'Важлива інформація' : lang === 'en' ? 'Important Notice' : 'Важная информация',
          text: infoVal[`text_${lang}`] || infoVal.text_ru
        };
      } else {
        const cat = value as RuleCategory;
        result[key] = {
          title: cat[`title_${lang}`] || cat.title_ru,
          text: cat[`text_${lang}`] || cat.text_ru
        };
      }
    }

    return result;
  }
}
