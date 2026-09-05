import { apiClient } from '../services/api-client';
import { appStore } from '../core/state';
export class StaffBoardComponent {
    staff = [];
    unsubscribe = null;
    constructor() {
        this.unsubscribe = appStore.subscribe((s) => s.language, () => this.loadStaff());
        this.loadStaff();
    }
    async loadStaff() {
        try {
            const response = await apiClient.getStaff();
            if (response && response.data) {
                this.staff = response.data;
                this.render();
            }
        }
        catch (err) {
            console.error('[StaffBoard] Failed to load staff:', err);
        }
    }
    render() {
        const container = document.getElementById('staff-list-container') || document.getElementById('staff-grid');
        if (!container)
            return;
        container.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'mc-grid mc-margin-top';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
        grid.style.gap = '14px';
        for (const member of this.staff) {
            const card = document.createElement('div');
            card.className = 'mc-card';
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.gap = '12px';
            card.style.padding = '12px';
            const rankBadgeColor = member.rank === 'OWNER' ? '#ff5555' : member.rank === 'ADMIN' ? '#ffaa00' : '#55ff55';
            card.innerHTML = `
        <div style="flex-shrink:0;">
          <img src="https://mc-heads.net/avatar/${encodeURIComponent(member.name)}/56" alt="${member.name}" style="width:56px; height:56px; border-radius:4px; image-rendering:pixelated;" loading="lazy" />
        </div>
        <div style="flex-grow:1; overflow:hidden;">
          <div style="font-weight:bold; font-size:14px; margin-bottom:4px; color:#fff; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${member.name}</div>
          <span style="background:${rankBadgeColor}22; color:${rankBadgeColor}; border:1px solid ${rankBadgeColor}; font-size:10px; padding:2px 6px; border-radius:3px; font-weight:bold;">
            ${member.rank}
          </span>
          <div style="margin-top:6px; background:rgba(255,255,255,0.1); height:4px; border-radius:2px; overflow:hidden;">
            <div style="background:var(--mc-accent); height:100%; width:${member.activity}%;"></div>
          </div>
          <div style="font-size:10px; color:#aaa; margin-top:4px;">Активність: ${member.activity}% | Попер.: ${member.warnings}/3</div>
        </div>
      `;
            grid.appendChild(card);
        }
        container.appendChild(grid);
    }
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}
//# sourceMappingURL=staff-board.js.map