import { HttpContext } from '../core/router';
import { RanksRepository } from '../infrastructure/ranks-repository';
import { BadRequestError, NotFoundError } from '../core/errors';
import { PlayerTranslate } from '../infrastructure/translate-service';

export class RanksController {
  private readonly ranksRepo: RanksRepository;

  constructor(ranksRepo: RanksRepository) {
    this.ranksRepo = ranksRepo;
  }

  public getAll = async (ctx: HttpContext): Promise<void> => {
    const lang = ctx.query['lang'] as string | undefined;
    const ranks = await this.ranksRepo.getAll(lang);
    ctx.json({
      success: true,
      count: ranks.length,
      data: ranks
    });
  };

  public getById = async (ctx: HttpContext): Promise<void> => {
    const rankId = ctx.params['id'];
    const lang = ctx.query['lang'] as string | undefined;

    if (!rankId) {
      throw new BadRequestError('Rank ID parameter is required');
    }

    const rank = await this.ranksRepo.getById(rankId, lang);
    if (!rank) {
      throw new NotFoundError(PlayerTranslate.translate(lang, 'ranks.not_found'));
    }

    ctx.json({
      success: true,
      data: rank
    });
  };

  public calculateUpgrade = async (ctx: HttpContext): Promise<void> => {
    const lang = ctx.query['lang'] as string | undefined;
    const { currentRank, targetRank } = ctx.body || {};

    if (!currentRank || !targetRank) {
      throw new BadRequestError(PlayerTranslate.translate(lang, 'validation.failed', 'currentRank and targetRank are required'));
    }

    const calculation = await this.ranksRepo.calculateUpgrade(String(currentRank), String(targetRank));

    ctx.json({
      success: true,
      message: PlayerTranslate.translate(lang, 'ranks.calculated'),
      data: calculation
    });
  };
}
