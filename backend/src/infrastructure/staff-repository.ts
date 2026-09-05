import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { StaffMember } from '../domain/types';
import { Logger } from '../core/logger';

export class StaffRepository {
  private readonly logger: Logger;
  private readonly possiblePaths: string[];

  constructor(logger?: Logger) {
    this.logger = logger ? logger.child('StaffRepository') : new Logger('StaffRepository');
    this.possiblePaths = [
      resolve(process.cwd(), '../site/staff.json'),
      resolve(process.cwd(), 'site/staff.json'),
      resolve(process.cwd(), 'web/site/staff.json'),
      resolve(__dirname, '../../../../site/staff.json'),
      resolve(__dirname, '../../../site/staff.json'),
      '/root/survival/plugins/AezaTech/staff.json'
    ];
  }

  private getFilePath(): string {
    for (const p of this.possiblePaths) {
      if (existsSync(p)) {
        return p;
      }
    }
    return this.possiblePaths[0]!;
  }

  public async getAll(): Promise<StaffMember[]> {
    const path = this.getFilePath();
    try {
      const data = await readFile(path, 'utf-8');
      const parsed: StaffMember[] = JSON.parse(data);
      return parsed;
    } catch (err) {
      this.logger.warn(`Could not load staff file from ${path}: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  public async getByName(name: string): Promise<StaffMember | null> {
    const list = await this.getAll();
    const found = list.find((m) => m.name.toLowerCase() === name.toLowerCase());
    return found || null;
  }
}
