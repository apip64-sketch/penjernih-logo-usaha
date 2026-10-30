export const VECTOR_COLORS = [2, 4, 8, 16] as const;
export type VectorColors = (typeof VECTOR_COLORS)[number];

// A frequency palette avoids grid sampling missing a flat color or blending it
// with transparent pixels when the source contains fewer colors than requested.
export function vectorPalette(data: Uint8ClampedArray, colors: VectorColors) {
  const histogram = new Map<string, { r: number; g: number; b: number; a: number; count: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    const r = a === 0 ? 0 : (data[i] ?? 0);
    const g = a === 0 ? 0 : (data[i + 1] ?? 0);
    const b = a === 0 ? 0 : (data[i + 2] ?? 0);
    const key = `${r >> 4},${g >> 4},${b >> 4},${a >> 4}`;
    const entry = histogram.get(key);
    if (entry) entry.count++;
    else histogram.set(key, { r, g, b, a, count: 1 });
  }
  const palette: { r: number; g: number; b: number; a: number }[] = [];
  for (const candidate of [...histogram.values()].sort((a, b) => b.count - a.count)) {
    if (palette.some((p) => (p.r - candidate.r) ** 2 + (p.g - candidate.g) ** 2 + (p.b - candidate.b) ** 2 + (p.a - candidate.a) ** 2 < 24 ** 2)) continue;
    palette.push({ r: candidate.r, g: candidate.g, b: candidate.b, a: candidate.a });
    if (palette.length === colors) break;
  }
  return palette;
}

// Geometry smoothing only: preserve small shapes and avoid blurring input pixels.
export function tracerOptions(colors: VectorColors, smoothing: number) {
  const amount = Math.min(100, Math.max(0, Number.isFinite(smoothing) ? smoothing : 50)) / 100;
  return {
    numberofcolors: colors,
    colorsampling: 2,
    colorquantcycles: 5,
    ltres: 0.1 + amount * 3.9,
    qtres: 0.1 + amount * 3.9,
    rightangleenhance: amount < 0.5,
    pathomit: 0,
    blurradius: 0,
    strokewidth: 0,
    roundcoords: 2,
    viewbox: true,
    desc: false,
  };
}

export async function vectorize(file: File, colors: VectorColors, smoothing: number) {
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Perangkat tidak mendukung pengolahan gambar.");
    context.drawImage(image, 0, 0);
    // Import only on a browser action, never while rendering the page on the server.
    const { default: tracer } = await import("imagetracerjs");
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const svg = tracer.imagedataToSVG(pixels, { ...tracerOptions(colors, smoothing), pal: vectorPalette(pixels.data, colors) });
    return svg.replace("<svg ", `<svg width="${canvas.width}" height="${canvas.height}" `);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export async function renderSvgPng(svgUrl: string): Promise<Blob> {
  const image = new Image();
  image.src = svgUrl;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Perangkat tidak mendukung pengolahan gambar.");
  context.drawImage(image, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Gagal membuat PNG dari vektor."));
  }, "image/png"));
}