import { describe, expect, it } from "vitest";
import { vtracerOptions } from "./vectorize";

describe("pemetaan opsi VTracer", () => {
  it.each([2, 4, 8, 16] as const)("preset poster memakai %i warna", (colors) => {
    expect(vtracerOptions("poster", colors)).toMatchObject({ preset: "poster", maxColors: colors });
  });
  it("preset bw mengabaikan jumlah warna", () => {
    const o = vtracerOptions("bw", 16);
    expect(o.preset).toBe("bw");
    expect(o.maxColors).toBeUndefined();
  });
});
