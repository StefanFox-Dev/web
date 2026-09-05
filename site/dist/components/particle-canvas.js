export class ParticleEngine {
    canvas;
    ctx;
    particles = [];
    animFrameId = null;
    isRunning = false;
    resizeHandler;
    visibilityHandler;
    constructor(canvasId) {
        const el = document.getElementById(canvasId);
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
            }
            else {
                this.resume();
            }
        };
        window.addEventListener('resize', this.resizeHandler);
        document.addEventListener('visibilitychange', this.visibilityHandler);
        this.resize();
        this.initParticles(35);
        this.start();
    }
    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        this.ctx.scale(dpr, dpr);
    }
    initParticles(count) {
        const colors = ['rgba(76, 175, 80, ', 'rgba(33, 150, 243, ', 'rgba(255, 193, 7, ', 'rgba(156, 39, 176, '];
        this.particles = [];
        for (let i = 0; i < count; i++) {
            const colorBase = colors[Math.floor(Math.random() * colors.length)];
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
    update() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (const p of this.particles) {
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y < -10) {
                p.y = h + 10;
                p.x = Math.random() * w;
            }
            if (p.x < -10)
                p.x = w + 10;
            if (p.x > w + 10)
                p.x = -10;
        }
    }
    render() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.ctx.clearRect(0, 0, w, h);
        for (const p of this.particles) {
            this.ctx.fillStyle = `${p.color}${p.opacity})`;
            this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        }
    }
    loop = () => {
        if (!this.isRunning)
            return;
        this.update();
        this.render();
        this.animFrameId = requestAnimationFrame(this.loop);
    };
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.loop();
    }
    pause() {
        this.isRunning = false;
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }
    resume() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.loop();
        }
    }
    destroy() {
        this.pause();
        window.removeEventListener('resize', this.resizeHandler);
        document.removeEventListener('visibilitychange', this.visibilityHandler);
        this.particles = [];
    }
}
//# sourceMappingURL=particle-canvas.js.map