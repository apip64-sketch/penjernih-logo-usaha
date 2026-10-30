import { describe, expect, it } from "vitest";
import { tracerOptions, vectorPalette } from "./vectorize";

describe("opsi tracing vektor", () => {
  it("mempertahankan warna datar dan transparansi saat jumlah warna sumber lebih sedikit", () => {
    const pixels = new Uint8ClampedArray([184, 36, 53, 255, 184, 36, 53, 255, 255, 255, 255, 255, 0, 0, 0, 0]);
    expect(vectorPalette(pixels, 4)).toEqual([
      { r: 184, g: 36, b: 53, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
      { r: 0, g: 0, b: 0, a: 0 },
    ]);
  });
  it.each([2, 4, 8, 16] as const)("memetakan pilihan %i warna ke jumlah warna tracer", (colors) => {
    expect(tracerOptions(colors, 50).numberofcolors).toBe(colors);
  });

  it("menghaluskan geometri tanpa menghapus detail kecil atau memburamkan piksel", () => {
    const detailed = tracerOptions(8, 0);
    const smooth = tracerOptions(8, 100);
    expect(detailed.ltres).toBe(0.1);
    expect(detailed.qtres).toBe(0.1);
    expect(smooth.ltres).toBe(4);
    expect(smooth.qtres).toBe(4);
    expect(smooth.pathomit).toBe(0);
    expect(smooth.blurradius).toBe(0);
  });
});