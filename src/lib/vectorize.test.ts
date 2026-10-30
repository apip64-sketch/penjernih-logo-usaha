import { describe, expect, it } from "vitest";
import { tracerOptions } from "./vectorize";

describe("opsi tracing vektor", () => {
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