// Client-side upscaling: step-wise high-quality canvas resize + unsharp mask.
export async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

export async function upscale(img: HTMLImageElement, scale: number): Promise<Blob> {
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  let src: CanvasImageSource = img;
  const targetW = w * scale;
  const targetH = h * scale;
  while (w < targetW) {
    const nw = Math.min(w * 2, targetW);
    const nh = Math.min(h * 2, targetH);
    const c = document.createElement("canvas");
    c.width = nw;
    c.height = nh;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, nw, nh);
    src = c;
    w = nw;
    h = nh;
  }
  const canvas = src as HTMLCanvasElement;
  sharpen(canvas, 0.8);
  return new Promise((r) => canvas.toBlob((b) => r(b!), "image/png"));
}

function sharpen(canvas: HTMLCanvasElement, amount: number) {
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  const id = ctx.getImageData(0, 0, w, h);
  const s = id.data;
  const o = new Uint8ClampedArray(s);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const k = i + c;
        const blur = (s[k - 4] + s[k + 4] + s[k - w * 4] + s[k + w * 4]) / 4;
        o[k] = s[k] + amount * (s[k] - blur) * 2;
      }
    }
  }
  ctx.putImageData(new ImageData(o, w, h), 0, 0);
}
