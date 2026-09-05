export class ToastManager {
  private static container: HTMLElement | null = null;

  public static show(message: string, duration = 3000): void {
    if (!this.container) {
      this.container = document.getElementById('mc-toast-container');
    }
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'mc-toast-container';
      this.container.className = 'mc-toast-container';
      document.body.appendChild(this.container);
    }

    const toast = document.createElement('div');
    toast.className = 'mc-toast';
    toast.innerHTML = `<span>✨</span><span>${message}</span>`;
    this.container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('mc-toast-show');
    });

    setTimeout(() => {
      toast.classList.remove('mc-toast-show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
}
