import { HttpContext } from '../core/router';
import { RulesRepository } from '../infrastructure/rules-repository';
import { NotFoundError } from '../core/errors';
import { PlayerTranslate } from '../infrastructure/translate-service';

export class RulesController {
  private readonly rulesRepo: RulesRepository;

  constructor(rulesRepo: RulesRepository) {
    this.rulesRepo = rulesRepo;
  }

  public getAll = async (ctx: HttpContext): Promise<void> => {
    const lang = ctx.query['lang'] as string | undefined;
    const rules = await this.rulesRepo.getLocalizedRules(lang);
    ctx.json({
      success: true,
      data: rules
    });
  };

  public getCategory = async (ctx: HttpContext): Promise<void> => {
    const categoryId = ctx.params['category'];
    const lang = ctx.query['lang'] as string | undefined;

    const rules = await this.rulesRepo.getLocalizedRules(lang);
    const found = categoryId ? rules[categoryId] : undefined;

    if (!found) {
      throw new NotFoundError(PlayerTranslate.translate(lang, 'rules.not_found'));
    }

    ctx.json({
      success: true,
      category: categoryId,
      data: found
    });
  };
}
