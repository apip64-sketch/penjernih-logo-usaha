export const VECTOR_PRESETS = ["poster", "bw"] as const;
export type VectorPreset = (typeof VECTOR_PRESETS)[number];
export const VECTOR_COLORS = [2, 4, 8, 16] as const;
export type VectorColors = (typeof VECTOR_COLORS)[number];

export type VTracerOptions = {
  preset: VectorPreset;
  mode: "spline";
  filterSpeckle: number;
  maxColors?: number;
  optimize: number;
};

// Pure mapping from UI controls to VTracer parameters. B/W logos are binary,
// so the color count only applies to the poster preset.
export function vtracerOptions(preset: VectorPreset, colors: VectorColors): VTracerOptions {
  if (preset === "bw") return { preset: "bw", mode: "spline", filterSpeckle: 2, optimize: 1 };
  return { preset: "poster", mode: "spline", filterSpeckle: 2, maxColors: colors, optimize: 1 };
}

type Wasm = { vectorize_rgba(rgba: Uint8Array, w: number, h: number, o: object): string };
let wasmPromise: Promise<Wasm> | null = null;

// The npm package is a Node build that reads its binary via fs. In the browser we
// evaluate its glue with the sync fs load swapped for an async instantiate.
function loadVTracer(): Promise<Wasm> {
  wasmPromise ??= (async () => {
    const { default: glue } = await import("@visioncortex/vtracer/pkg/vtracer_wasm.js?raw");
    // Binary lives in public/wasm so it never enters the server bundle.
    const wasmUrl = ["/wasm/vtracer_wasm_bg", "wasm"].join(".");
    const start = glue.indexOf("const wasmPath");
    if (start < 0) throw new Error("Library vektor tidak dikenali.");
    const src = glue.slice(0, start) +
      "let wasm; exports.__imports = __wbg_get_imports; exports.__init = (i) => { wasm = i.exports; wasm.__wbindgen_start(); };";
    const mod: { __imports?: () => WebAssembly.Imports; __init?: (i: WebAssembly.Instance) => void } = {};
    new Function("exports", "require", "module", src)(mod, () => ({}), { exports: mod });
    const bytes = await (await fetch(wasmUrl)).arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, mod.__imports!());
    mod.__init!(instance);
    return mod as unknown as Wasm;
  })().catch((e) => { wasmPromise = null; throw e; });
  return wasmPromise;
}

export async function vectorize(file: File, preset: VectorPreset, colors: VectorColors) {
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
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const vt = await loadVTracer();
    const svg = vt.vectorize_rgba(new Uint8Array(pixels.data.buffer), canvas.width, canvas.height, vtracerOptions(preset, colors));
    return /<svg[^>]*\swidth=/.test(svg) ? svg : svg.replace("<svg ", `<svg width="${canvas.width}" height="${canvas.height}" `);
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
