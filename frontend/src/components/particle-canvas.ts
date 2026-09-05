interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  color: string;
}

export class ParticleEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animFrameId: number | null = null;
  private isRunning = false;
  private readonly resizeHandler: () => void;
  private readonly visibilityHandler: () => void;

  constructor(canvasId: string) {
    const el = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!el) {
      throw new Error(`Canvas #${canvasId} not found`);
    }
    this.canvas = el;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.ctx = context;

    this.resizeHandler = () => this.resize();
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    };

    window.addEventListener('resize', this.resizeHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.resize();
    this.initParticles(35);
    this.start();
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
  }

  private initParticles(count: number): void {
    const colors = ['rgba(76, 175, 80, ', 'rgba(33, 150, 243, ', 'rgba(255, 193, 7, ', 'rgba(156, 39, 176, '];
    this.particles = [];

    for (let i = 0; i < count; i++) {
      const colorBase = colors[Math.floor(Math.random() * colors.length)]!;
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 3 + 1.5,
        speedY: -(Math.random() * 0.4 + 0.15),
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.2,
        color: colorBase
      });
    }
  }

  private update(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const p of this.particles) {
      p.y += p.speedY;
      p.x += p.speedX;

      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    }
  }

  private render(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.clearRect(0, 0, w, h);

    for (const p of this.particles) {
      this.ctx.fillStyle = `${p.color}${p.opacity})`;
      this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.update();
    this.render();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  public pause(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.loop();
    }
  }

  public destroy(): void {
    this.pause();
    window.removeEventListener('resize', this.resizeHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.particles = [];
  }
}
