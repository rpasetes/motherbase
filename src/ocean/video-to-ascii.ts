export class VideoToASCII {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sourceCanvas: HTMLCanvasElement;
  private sourceCtx: CanvasRenderingContext2D;

  private charWidth = 8;
  private charHeight = 16;
  private cols = 160;
  private rows = 90;

  private animationId: number | null = null;

  // ASCII character palette from dark to light
  private chars = ' .,:;~*+=<>!?@#$%&';

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.video = video;
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;

    // Create off-screen canvas for video sampling
    this.sourceCanvas = document.createElement('canvas');
    const sourceCtx = this.sourceCanvas.getContext('2d');
    if (!sourceCtx) throw new Error('Could not get source canvas context');
    this.sourceCtx = sourceCtx;

    this.setupCanvas();
  }

  private setupCanvas() {
    // Set canvas size to fit character grid
    this.canvas.width = this.cols * this.charWidth;
    this.canvas.height = this.rows * this.charHeight;

    // Set source canvas to match columns/rows for sampling
    this.sourceCanvas.width = this.cols;
    this.sourceCanvas.height = this.rows;

    // Configure text rendering
    this.ctx.font = `${this.charHeight}px monospace`;
    this.ctx.textBaseline = 'top';
  }

  private getColorForPosition(y: number, luminance: number): string {
    const normalizedY = y / this.rows;

    // Top: deep ocean teal
    // Middle: lighter water/foam
    // Bottom: sand tones

    if (normalizedY < 0.4) {
      // Deep water - darker teals
      const r = Math.floor(26 + luminance * 20);
      const g = Math.floor(95 + luminance * 60);
      const b = Math.floor(95 + luminance * 60);
      return `rgb(${r},${g},${b})`;
    } else if (normalizedY < 0.7) {
      // Shallow water/foam - teals to whites
      const r = Math.floor(100 + luminance * 155);
      const g = Math.floor(150 + luminance * 105);
      const b = Math.floor(150 + luminance * 105);
      return `rgb(${r},${g},${b})`;
    } else {
      // Sand - warm tans
      const r = Math.floor(150 + luminance * 105);
      const g = Math.floor(130 + luminance * 85);
      const b = Math.floor(90 + luminance * 65);
      return `rgb(${r},${g},${b})`;
    }
  }

  private getCharForLuminance(luminance: number): string {
    const index = Math.floor(luminance * (this.chars.length - 1));
    return this.chars[index] || ' ';
  }

  private render() {
    // Draw video frame to source canvas at reduced resolution
    this.sourceCtx.drawImage(
      this.video,
      0, 0,
      this.sourceCanvas.width,
      this.sourceCanvas.height
    );

    // Get pixel data
    const imageData = this.sourceCtx.getImageData(
      0, 0,
      this.sourceCanvas.width,
      this.sourceCanvas.height
    );

    // Clear canvas
    this.ctx.fillStyle = '#0a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Convert to ASCII
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = (y * this.cols + x) * 4;
        const r = imageData.data[i] || 0;
        const g = imageData.data[i + 1] || 0;
        const b = imageData.data[i + 2] || 0;

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Get character and color
        const char = this.getCharForLuminance(luminance);
        const color = this.getColorForPosition(y, luminance);

        // Draw character
        this.ctx.fillStyle = color;
        this.ctx.fillText(
          char,
          x * this.charWidth,
          y * this.charHeight
        );
      }
    }

    // Continue loop
    this.animationId = requestAnimationFrame(() => this.render());
  }

  start() {
    if (this.video.paused) {
      this.video.play();
    }
    this.render();
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
