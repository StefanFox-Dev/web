export interface StaffMember {
  name: string;
  rank: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'HELPER';
  date: string;
  activity: number;
  warnings: number;
}

export interface RuleCategory {
  title_ru: string;
  title_en: string;
  title_uk: string;
  text_ru: string;
  text_en: string;
  text_uk: string;
}

export interface RulesDocument {
  info: {
    text_ru: string;
    text_en: string;
    text_uk: string;
  };
  [categoryKey: string]: RuleCategory | { text_ru: string; text_en: string; text_uk: string };
}

export interface RankCommand {
  name: string;
  desc_ru: string;
  desc_en: string;
  desc_uk: string;
}

export interface RankDefinition {
  id: string;
  prefix: string;
  color: string;
  hp: string;
  rgCount: string;
  rgBlocks: string;
  homes: string;
  warps: string;
  saveInv: string;
  xp: string;
  banLimit: string;
  price?: number;
  commands: RankCommand[];
  other_ru: string;
  other_en: string;
  other_uk: string;
}
