import { apiClient } from '../services/api-client';
import { appStore } from '../core/state';

export class RulesViewerComponent {
  private rulesData: Record<string, { title: string; text: string }> = {};
  private unsubscribe: (() => void) | null = null;
  private searchInput: HTMLInputElement | null = null;
  private searchHandler: (() => void) | null = null;

  constructor() {
    this.unsubscribe = appStore.subscribe(
      (s) => s.language,
      () => this.loadRules()
    );
    this.loadRules();
    this.setupSearch();
  }

  private async loadRules(): Promise<void> {
    try {
      const response = await apiClient.getRules();
      if (response && response.data) {
        this.rulesData = response.data;
        this.render();
      }
    } catch (err) {
      console.error('[RulesViewer] Failed to load rules:', err);
    }
  }

  private setupSearch(): void {
    this.searchInput = document.getElementById('rules-search-input') as HTMLInputElement;
    if (this.searchInput) {
      this.searchHandler = () => this.filterRules(this.searchInput?.value || '');
      this.searchInput.addEventListener('input', this.searchHandler);
    }
  }

  private filterRules(query: string): void {
    const q = query.toLowerCase().trim();
    const items = document.querySelectorAll<HTMLElement>('.mc-rule-section');

    for (const item of items) {
      const text = item.textContent?.toLowerCase() || '';
      if (!q || text.includes(q)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    }
  }

  private render(): void {
    const container = document.getElementById('rules-list-container') || document.getElementById('rules-container');
    if (!container) return;

    container.innerHTML = '';

    for (const [key, rule] of Object.entries(this.rulesData)) {
      const section = document.createElement('div');
      section.className = 'mc-rule-section mc-card mc-margin-top';
      section.dataset.category = key;
      section.style.marginBottom = '14px';

      section.innerHTML = `
        <h3 class="mc-subtitle" style="color: var(--mc-accent); margin-bottom: 8px;">${rule.title}</h3>
        <p class="mc-text" style="white-space: pre-line; line-height: 1.6; color:#e0e0e0;">${rule.text}</p>
      `;

      container.appendChild(section);
    }
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.searchInput && this.searchHandler) {
      this.searchInput.removeEventListener('input', this.searchHandler);
    }
  }
}
