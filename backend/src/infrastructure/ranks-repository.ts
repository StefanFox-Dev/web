import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { RankDefinition } from '../domain/types';
import { Logger } from '../core/logger';
import { PlayerTranslate, SupportedLanguage } from './translate-service';

const DEFAULT_RANK_PRICES: Record<string, number> = {
  PLAYER: 0,
  VIP: 49,
  PREMIUM: 99,
  CREATIVE: 149,
  HERO: 199,
  LEGEND: 299,
  ULTRA: 399,
  SPONSOR: 599,
  ELITE: 799,
  OVERLORD: 999,
  IMPERATOR: 1499,
  DRAGON: 1999,
  TITAN: 2999,
  AEZA: 4999
};

export class RanksRepository {
  private readonly logger: Logger;
  private readonly possiblePaths: string[];
  private cache: RankDefinition[] | null = null;

  constructor(logger?: Logger) {
    this.logger = logger ? logger.child('RanksRepository') : new Logger('RanksRepository');
    this.possiblePaths = [
      resolve(process.cwd(), '../site/ranks.json'),
      resolve(process.cwd(), 'site/ranks.json'),
      resolve(process.cwd(), 'web/site/ranks.json'),
      resolve(__dirname, '../../../../site/ranks.json'),
      resolve(__dirname, '../../../site/ranks.json')
    ];
  }

  private getFilePath(): string {
    for (const p of this.possiblePaths) {
      if (existsSync(p)) return p;
    }
    return this.possiblePaths[0]!;
  }

  public async getAll(langRaw?: string): Promise<RankDefinition[]> {
    const lang: SupportedLanguage = PlayerTranslate.normalizeLang(langRaw);

    if (!this.cache) {
      const path = this.getFilePath();
      try {
        const data = await readFile(path, 'utf-8');
        this.cache = JSON.parse(data);
      } catch (err) {
        this.logger.error(`Could not read ranks.json from ${path}`, err instanceof Error ? err : undefined);
        return [];
      }
    }

    return (this.cache || []).map((rank) => {
      const price = DEFAULT_RANK_PRICES[rank.id] ?? (DEFAULT_RANK_PRICES[rank.prefix.toUpperCase()] ?? 100);
      return {
        ...rank,
        price,
        commands: rank.commands.map((cmd) => ({
          name: cmd.name,
          desc_ru: cmd.desc_ru,
          desc_en: cmd.desc_en,
          desc_uk: cmd.desc_uk,
          description: cmd[`desc_${lang}`] || cmd.desc_ru
        })),
        other: rank[`other_${lang}`] || rank.other_ru
      } as RankDefinition & { other: string };
    });
  }

  public async getById(rankId: string, lang?: string): Promise<RankDefinition | null> {
    const all = await this.getAll(lang);
    const found = all.find((r) => r.id.toLowerCase() === rankId.toLowerCase() || r.prefix.toLowerCase() === rankId.toLowerCase());
    return found || null;
  }

  public async calculateUpgrade(currentRankId: string, targetRankId: string): Promise<{
    currentRank: string;
    targetRank: string;
    currentPrice: number;
    targetPrice: number;
    upgradeCost: number;
    discount: number;
  }> {
    const current = await this.getById(currentRankId);
    const target = await this.getById(targetRankId);

    const currentPrice = current?.price ?? 0;
    const targetPrice = target?.price ?? 0;
    const upgradeCost = Math.max(0, targetPrice - currentPrice);
    const discount = targetPrice > currentPrice ? currentPrice : 0;

    return {
      currentRank: current?.prefix || currentRankId,
      targetRank: target?.prefix || targetRankId,
      currentPrice,
      targetPrice,
      upgradeCost,
      discount
    };
  }
}
