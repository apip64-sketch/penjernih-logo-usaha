import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { loadImage, upscale } from "@/lib/upscale";
import { renderSvgPng, vectorize, VECTOR_COLORS, type VectorColors } from "@/lib/vectorize";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Penjernih Logo — Perjelas logo untuk tas custom" },
      { name: "description", content: "Perbesar dan pertajam logo 2x atau 4x, atau ubah ke vektor SVG langsung di browser tanpa server." },
      { property: "og:title", content: "Penjernih Logo" },
      { property: "og:description", content: "Perbesar logo ke PNG atau ubah ke vektor SVG langsung di browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [scale, setScale] = useState(2);
  const [strength, setStrength] = useState(50);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [pos, setPos] = useState(50);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState<"png" | "svg">("png");
  const [colors, setColors] = useState<VectorColors>(8);
  const [smoothing, setSmoothing] = useState(50);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);

  useEffect(() => () => { if (before) URL.revokeObjectURL(before); }, [before]);
  useEffect(() => () => { if (after) URL.revokeObjectURL(after); }, [after]);
  useEffect(() => () => { if (svgUrl) URL.revokeObjectURL(svgUrl); }, [svgUrl]);

  const pick = (f?: File) => {
    if (!f || busy) return;
    if (!/image\/(png|jpe?g)/.test(f.type)) return setErr("Format harus PNG atau JPG.");
    setErr("");
    setFile(f);
    setBefore(URL.createObjectURL(f));
    setAfter(null);
    setSvgUrl(null);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      if (mode === "svg") {
        // Let the processing label paint before the synchronous tracing work.
        await new Promise((resolve) => setTimeout(resolve, 30));
        const svg = await vectorize(file, colors, smoothing);
        setSvgUrl(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })));
        return;
      }
      const img = await loadImage(file);
      if (img.naturalWidth * scale > 8000 || img.naturalHeight * scale > 8000)
        throw new Error("Gambar terlalu besar untuk skala ini. Coba 2x atau gambar lebih kecil.");
      const blob = await upscale(img, scale, strength / 100);
      setAfter(URL.createObjectURL(blob));
      setPos(50);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memproses gambar.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!after || !file) return;
    const a = document.createElement("a");
    a.href = after;
    a.download = `${file.name.replace(/\.\w+$/, "")}-${scale}x.png`;
    a.click();
  };

  const downloadVector = async (format: "svg" | "png") => {
    if (!svgUrl || !file) return;
    setBusy(true);
    setErr("");
    let pngUrl: string | null = null;
    try {
      if (format === "png") pngUrl = URL.createObjectURL(await renderSvgPng(svgUrl));
      const a = document.createElement("a");
      a.href = pngUrl ?? svgUrl;
      a.download = `${file.name.replace(/\.\w+$/, "")}-vektor.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setErr("Gagal mengunduh hasil vektor. Silakan coba lagi.");
    } finally {
      if (pngUrl) {
        const url = pngUrl;
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <header className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Penjernih Logo</h1>
          <p className="mt-3 text-muted-foreground">Perbesar & pertajam logo untuk cetak tas custom — langsung di HP atau laptop Anda.</p>
        </header>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-primary bg-accent" : "border-border bg-card hover:bg-accent"}`}
        >
          <input ref={inputRef} type="file" accept="image/png,image/jpeg" disabled={busy} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <p className="break-all font-medium text-foreground">{file ? file.name : "Seret gambar ke sini"}</p>
          <p className="mt-1 text-sm text-muted-foreground">atau</p>
          <span className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Pilih File</span>
          <p className="mt-3 text-xs text-muted-foreground">PNG atau JPG</p>
        </div>

        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
          {mode === "png" ? "💡 Cocok untuk logo sederhana. Untuk foto kompleks, hasil terbatas." : "Terbaik untuk logo datar/sablon. Untuk foto kompleks, pakai mode Perbesar."}
        </p>

        <div className="mt-6 flex rounded-lg border border-border bg-card p-1" role="group" aria-label="Mode pengolahan">
          {([ ["png", "Perbesar (PNG)"], ["svg", "Vektor (SVG)"] ] as const).map(([value, label]) => (
            <Button key={value} variant={mode === value ? "default" : "ghost"} disabled={busy}
              aria-pressed={mode === value} onClick={() => { setMode(value); setErr(""); }} className="flex-1">
              {label}
            </Button>
          ))}
        </div>

        {mode === "svg" && (
          <div className="mt-4 space-y-4">
            <fieldset disabled={busy}>
              <legend className="mb-2 text-sm font-medium">Jumlah warna</legend>
              <div className="flex rounded-lg border border-border bg-card p-1">
                {VECTOR_COLORS.map((value) => (
                  <Button key={value} variant={colors === value ? "default" : "ghost"} disabled={busy}
                    aria-pressed={colors === value} aria-label={`${value} warna`} className="flex-1"
                    onClick={() => { setColors(value); setSvgUrl(null); }}>{value}</Button>
                ))}
              </div>
            </fieldset>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="smoothing" className="text-sm font-medium">Penghalusan (smoothing)</label>
                <span className="text-sm tabular-nums text-muted-foreground">{smoothing}%</span>
              </div>
              <input id="smoothing" type="range" min={0} max={100} value={smoothing} disabled={busy}
                onChange={(e) => { setSmoothing(+e.target.value); setSvgUrl(null); }} className="mt-2 w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>Detail</span><span>Halus</span></div>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          {mode === "png" && (
          <div className="flex rounded-lg border border-border bg-card p-1">
            {[2, 4].map((s) => (
              <Button key={s} disabled={busy} variant={scale === s ? "default" : "ghost"} onClick={() => { setScale(s); setAfter(null); }}
                className={`flex-1 rounded-md px-6 py-2 text-sm font-medium transition-colors ${scale === s ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}>
                {s}x
              </Button>
            ))}
          </div>
          )}
          <Button onClick={run} disabled={!file || busy}
            className="h-12 flex-1 rounded-lg px-6 font-medium">
            {busy ? "Memproses…" : mode === "png" ? "Jernihkan Logo" : "Ubah ke Vektor (SVG)"}
          </Button>
        </div>

        {mode === "png" && (
        <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <label htmlFor="strength" className="text-sm font-medium text-foreground">Tingkat penajaman</label>
            <span className="text-sm tabular-nums text-muted-foreground">{strength}%</span>
          </div>
          <input id="strength" type="range" min={0} max={100} value={strength} disabled={busy}
            onChange={(e) => { setStrength(+e.target.value); setAfter(null); }}
            className="mt-2 w-full accent-primary" />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Halus</span>
            <span>Tajam</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Naikkan untuk memperjelas detail logo kecil; turunkan jika tepi mulai tampak kasar.
          </p>
        </div>
        )}

        {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}

        {mode === "svg" && svgUrl && (
          <section className="mt-8" aria-label="Hasil vektor">
            <h2 className="mb-3 text-sm font-medium">Hasil Vektor (SVG)</h2>
            <div className="checker aspect-square overflow-hidden rounded-xl border border-border">
              <img src={svgUrl} alt="Hasil vektor SVG" className="h-full w-full object-contain" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button className="h-12" disabled={busy} onClick={() => downloadVector("svg")}><Download />Unduh SVG</Button>
              <Button className="h-12" variant="outline" disabled={busy} onClick={() => downloadVector("png")}><Download />Unduh PNG</Button>
            </div>
          </section>
        )}

        {mode === "png" && before && after && (
          <section className="mt-8">
            <div className="checker relative aspect-square w-full select-none overflow-hidden rounded-xl border border-border">
              <img src={after} alt="Sesudah" className="absolute inset-0 h-full w-full object-contain" />
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                <img src={before} alt="Sebelum" className="h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />
              </div>
              <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${pos}%` }} />
              <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">Sebelum</span>
              <span className="absolute right-2 top-2 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">Sesudah {scale}x</span>
              <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)}
                aria-label="Geser perbandingan" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">Geser untuk membandingkan</p>
            <Button onClick={download} className="mt-4 h-12 w-full rounded-lg px-6 font-medium">
              Download PNG
            </Button>
          </section>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground">Semua proses di perangkat Anda. Gambar tidak diunggah ke mana pun.</footer>
      </div>
    </main>
  );
}
