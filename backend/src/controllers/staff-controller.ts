import { HttpContext } from '../core/router';
import { StaffRepository } from '../infrastructure/staff-repository';
import { NotFoundError, BadRequestError } from '../core/errors';
import { PlayerTranslate } from '../infrastructure/translate-service';

export class StaffController {
  private readonly staffRepo: StaffRepository;

  constructor(staffRepo: StaffRepository) {
    this.staffRepo = staffRepo;
  }

  public getAll = async (ctx: HttpContext): Promise<void> => {
    const list = await this.staffRepo.getAll();
    ctx.json({
      success: true,
      count: list.length,
      data: list
    });
  };

  public getByName = async (ctx: HttpContext): Promise<void> => {
    const name = ctx.params['name'];
    const lang = ctx.query['lang'] as string | undefined;

    if (!name) {
      throw new BadRequestError('Player name parameter is required');
    }

    const member = await this.staffRepo.getByName(name);
    if (!member) {
      throw new NotFoundError(PlayerTranslate.translate(lang, 'staff.not_found'));
    }

    ctx.json({
      success: true,
      data: member
    });
  };
}
