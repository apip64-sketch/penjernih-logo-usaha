export const VECTOR_COLORS = [2, 4, 8, 16] as const;
export type VectorColors = (typeof VECTOR_COLORS)[number];

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
    const svg = tracer.imagedataToSVG(context.getImageData(0, 0, canvas.width, canvas.height), tracerOptions(colors, smoothing));
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