export class SpriteLoader {
  private cache = new Map<string, HTMLImageElement>();

  async load(url: string): Promise<HTMLImageElement> {
    const cached = this.cache.get(url);
    if (cached) return cached;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  get(url: string): HTMLImageElement | undefined {
    return this.cache.get(url);
  }
}
