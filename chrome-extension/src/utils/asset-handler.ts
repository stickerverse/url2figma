import { AssetRegistry, ImageAsset, SVGAsset } from '../types/schema';

export class AssetHandler {
  constructor(private registry: AssetRegistry) {}

  async registerImage(url: string, width: number, height: number): Promise<string> {
    const hash = this.hashURL(url);
    
    if (!this.registry.images[hash]) {
      const shouldEmbed = this.shouldEmbedImage(width, height);
      
      let base64: string | undefined;
      if (shouldEmbed) {
        try {
          base64 = await this.urlToBase64(url);
        } catch (e) {
          console.warn('Failed to convert image to base64:', url, e);
        }
      }

      this.registry.images[hash] = {
        hash,
        url,
        base64,
        width,
        height,
        mimeType: this.getMimeType(url)
      };
    }

    return hash;
  }

  async registerSVG(svgCode: string, width: number, height: number): Promise<string> {
    const hash = this.hashString(svgCode);
    
    if (!this.registry.svgs[hash]) {
      this.registry.svgs[hash] = {
        hash,
        svgCode,
        width,
        height
      };
    }

    return hash;
  }

  private shouldEmbedImage(width: number, height: number): boolean {
    return width * height < 10000;
  }

  private async urlToBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        try {
          const base64 = canvas.toDataURL(this.getMimeType(url));
          resolve(base64);
        } catch (e) {
          reject(e);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  private getMimeType(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    return mimeTypes[ext || ''] || 'image/png';
  }

  private hashURL(url: string): string {
    return this.hashString(url);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `asset-${Math.abs(hash).toString(16)}`;
  }
}
