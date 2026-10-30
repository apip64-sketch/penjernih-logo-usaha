// Client-side upscaling: step-wise high-quality canvas resize + unsharp mask.
export async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

export async function upscale(img: HTMLImageElement, scale: number, strength = 0.5): Promise<Blob> {
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
  if (strength > 0) {
    const palette = extractPalette(img, 8);
    crispEdges(canvas, palette, strength);
  }
  return new Promise((r) => canvas.toBlob((b) => r(b!), "image/png"));
}

type Col = [number, number, number, number];

// k-means on original pixels to find the logo's dominant flat colors.
function extractPalette(img: HTMLImageElement, k: number): Col[] {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const total = d.length / 4;
  const step = Math.max(1, Math.floor(total / 20000));
  const pts: Col[] = [];
  for (let i = 0; i < total; i += step) {
    const j = i * 4;
    pts.push([d[j]!, d[j + 1]!, d[j + 2]!, d[j + 3]!]);
  }
  // init: spread over sorted luminance
  const sorted = [...pts].sort((a, b) => a[0] + a[1] + a[2] + a[3] - (b[0] + b[1] + b[2] + b[3]));
  let cent: Col[] = Array.from({ length: k }, (_, i) => [...sorted[Math.floor(((i + 0.5) / k) * sorted.length)]!] as Col);
  for (let it = 0; it < 10; it++) {
    const sum = cent.map(() => [0, 0, 0, 0, 0]);
    for (const p of pts) {
      const n = nearest(p, cent)[0];
      const s = sum[n]!;
      for (let q = 0; q < 4; q++) s[q]! += p[q]!;
      s[4]!++;
    }
    cent = cent.map((c0, i) => {
      const s = sum[i]!;
      return s[4]! ? ([s[0]! / s[4]!, s[1]! / s[4]!, s[2]! / s[4]!, s[3]! / s[4]!] as Col) : c0;
    });
  }
  // drop near-duplicates
  const out: Col[] = [];
  for (const c0 of cent) if (!out.some((o) => dist(o, c0) < 300)) out.push(c0);
  return out;
}

function dist(a: Col, b: Col) {
  const r = a[0] - b[0], g = a[1] - b[1], bl = a[2] - b[2], al = a[3] - b[3];
  return r * r + g * g + bl * bl + al * al;
}

function nearest(p: Col, pal: Col[]): [number, number] {
  let a = 0, b = 0, da = Infinity, db = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const dd = dist(p, pal[i]!);
    if (dd < da) { db = da; b = a; da = dd; a = i; }
    else if (dd < db) { db = dd; b = i; }
  }
  return [a, b];
}

// Snap smooth upscaled pixels toward palette colors with a curve whose
// steepness follows `strength` (0..1): low = soft anti-aliased edges,
// high = very crisp edges.
function crispEdges(canvas: HTMLCanvasElement, pal: Col[], strength: number) {
  const slope = 4 + strength * 18;
  const ctx = canvas.getContext("2d")!;
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = id.data;
  const p: Col = [0, 0, 0, 0];
  const single = pal.length < 2;
  for (let i = 0; i < d.length; i += 4) {
    p[0] = d[i]!; p[1] = d[i + 1]!; p[2] = d[i + 2]!; p[3] = d[i + 3]!;
    const [ai, bi] = nearest(p, pal);
    const A = pal[ai]!;
    if (single) { for (let q = 0; q < 4; q++) d[i + q] = A[q]!; continue; }
    const B = pal[bi]!;
    let num = 0, den = 0;
    for (let q = 0; q < 4; q++) { const e = B[q]! - A[q]!; num += (p[q]! - A[q]!) * e; den += e * e; }
    let t = den ? num / den : 0;
    t = Math.min(1, Math.max(0, t));
    const s = 1 / (1 + Math.exp(-(t - 0.5) * 14));
    const tt = (s - 0.0009) / 0.9982;
    for (let q = 0; q < 4; q++) d[i + q] = A[q]! + (B[q]! - A[q]!) * tt;
  }
  ctx.putImageData(id, 0, 0);
}

