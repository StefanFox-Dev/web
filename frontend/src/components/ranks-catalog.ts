import { apiClient } from '../services/api-client';
import { appStore } from '../core/state';
import { SoundFxService } from './sound-fx';
import { ToastManager } from './toast-manager';

export interface RankData {
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
  commands: Array<{ name: string; description?: string; desc_ru?: string }>;
  other: string;
}

export class RanksCatalogComponent {
  private ranks: RankData[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.unsubscribe = appStore.subscribe(
      (s) => s.language,
      () => this.loadRanks()
    );
    this.loadRanks();
  }

  private async loadRanks(): Promise<void> {
    try {
      const response = await apiClient.getRanks();
      if (response && response.data) {
        this.ranks = response.data;
        this.renderCatalog();
        this.renderRanksDesc();
      }
    } catch (err) {
      console.error('[RanksCatalog] Failed to load ranks:', err);
    }
  }

  private renderCatalog(): void {
    const container = document.getElementById('ranks-list-container') || document.getElementById('ranks-list');
    if (!container) return;

    container.innerHTML = '';
    for (const rank of this.ranks) {
      const card = document.createElement('div');
      card.className = 'mc-rank-card';
      card.style.borderColor = rank.color || 'var(--mc-border)';

      const priceTag = rank.price ? `${rank.price} ₴` : 'FREE';

      card.innerHTML = `
        <div class="mc-rank-header" style="background: ${rank.color}22; border-bottom: 2px solid ${rank.color};">
          <span class="mc-rank-title" style="color: ${rank.color}; font-weight: bold;">${rank.prefix}</span>
          <span class="mc-rank-price">${priceTag}</span>
        </div>
        <div class="mc-rank-body">
          <div class="mc-perk-row"><span>HP:</span><b>${rank.hp}</b></div>
          <div class="mc-perk-row"><span>Привати:</span><b>${rank.rgCount} (${rank.rgBlocks})</b></div>
          <div class="mc-perk-row"><span>Точки дому:</span><b>${rank.homes}</b></div>
          <div class="mc-perk-row"><span>Збереження:</span><b>${rank.saveInv}</b></div>
        </div>
        <button class="mc-btn mc-btn-primary mc-rank-select-btn" data-rank="${rank.id}">Обрати</button>
      `;

      const selectBtn = card.querySelector('.mc-rank-select-btn');
      if (selectBtn) {
        selectBtn.addEventListener('click', () => {
          SoundFxService.playClick();
          this.selectRank(rank);
        });
      }

      container.appendChild(card);
    }
  }

  private renderRanksDesc(): void {
    const container = document.getElementById('ranks-desc-container') || document.getElementById('ranks-compare-table-container');
    if (!container) return;

    container.innerHTML = '';
    for (const rank of this.ranks) {
      const item = document.createElement('details');
      item.className = 'mc-rank-detail-accordion mc-card';
      item.style.marginBottom = '12px';

      const commandsHtml = rank.commands.map((cmd) => `
        <div class="mc-command-item" style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <code style="color:var(--mc-accent);">${cmd.name}</code>
          <span>${cmd.description || cmd.desc_ru || ''}</span>
        </div>
      `).join('');

      item.innerHTML = `
        <summary style="color: ${rank.color}; font-weight:bold; cursor:pointer; padding:6px 0;">
          [${rank.prefix}] — Опис можливостей та команд
        </summary>
        <div class="mc-rank-detail-content" style="padding-top:10px;">
          <p style="white-space: pre-line; margin-bottom: 8px; color:#ddd;">${rank.other || ''}</p>
          <div class="mc-commands-list">${commandsHtml}</div>
        </div>
      `;

      container.appendChild(item);
    }
  }

  private selectRank(rank: RankData): void {
    appStore.setState({ selectedRankId: rank.id });
    ToastManager.show(`Обрано привілей: ${rank.prefix}`);
    const input = document.getElementById('donate-rank-select') as HTMLSelectElement | null;
    if (input) {
      input.value = rank.id;
    }
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
