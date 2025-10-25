export class PageScroller {
  private originalY = 0;

  async scrollPage(): Promise<void> {
    this.originalY = window.scrollY;
    console.log('📜 Starting page scroll...');

    const height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const viewportHeight = window.innerHeight;
    const steps = Math.ceil(height / viewportHeight);

    console.log(`📜 Will scroll ${steps} times`);

    for (let i = 0; i <= steps; i++) {
      const scrollTo = i * viewportHeight;
      console.log(`📜 Scrolling to ${scrollTo}px`);
      
      window.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      });

      await this.wait(1000); // 1 second between scrolls
    }

    console.log('📜 Scrolling back to top');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await this.wait(500);
  }

  restore(): void {
    window.scrollTo({ top: this.originalY, behavior: 'instant' });
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
