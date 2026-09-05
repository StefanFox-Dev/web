import { SoundFxService } from './sound-fx';
import { ToastManager } from './toast-manager';

export class SkinViewerComponent {
  private viewer: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private loadBtn: HTMLButtonElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private loadHandler: (() => void) | null = null;

  constructor() {
    this.initViewer();
  }

  private initViewer(): void {
    this.canvas = document.getElementById('skin-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    const Skinview3d = (window as any).skinview3d;
    if (Skinview3d && Skinview3d.SkinViewer) {
      try {
        this.viewer = new Skinview3d.SkinViewer({
          canvas: this.canvas,
          width: 280,
          height: 350,
          skin: 'https://mc-heads.net/skin/Sony'
        });

        if (Skinview3d.WalkingAnimation) {
          this.viewer.animation = new Skinview3d.WalkingAnimation();
          this.viewer.animation.speed = 0.6;
        }
      } catch (err) {
        console.error('[SkinViewer] WebGL initialization error:', err);
      }
    }

    this.inputEl = (document.getElementById('skin-input-nick') || document.getElementById('skin-nickname-input')) as HTMLInputElement;
    this.loadBtn = (document.getElementById('skin-search-btn') || document.getElementById('load-skin-btn')) as HTMLButtonElement;

    if (this.loadBtn && this.inputEl) {
      this.loadHandler = () => {
        SoundFxService.playClick();
        const nick = this.inputEl?.value.trim();
        if (!nick) {
          ToastManager.show('Введіть нікнейм гравця');
          return;
        }
        this.loadSkin(nick);
      };
      this.loadBtn.addEventListener('click', this.loadHandler);
    }
  }

  public loadSkin(nickname: string): void {
    if (!this.viewer) return;
    const skinUrl = `https://mc-heads.net/skin/${encodeURIComponent(nickname)}`;
    this.viewer.loadSkin(skinUrl)
      .then(() => {
        ToastManager.show(`Скін гравця ${nickname} завантажено!`);
        SoundFxService.playSuccess();
      })
      .catch(() => {
        ToastManager.show('Не вдалося завантажити скін');
      });
  }

  public destroy(): void {
    if (this.loadBtn && this.loadHandler) {
      this.loadBtn.removeEventListener('click', this.loadHandler);
    }
    if (this.viewer && typeof this.viewer.dispose === 'function') {
      try {
        this.viewer.dispose();
      } catch {}
      this.viewer = null;
    }
  }
}
