import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { loadImage, upscale } from "@/lib/upscale";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Penjernih Logo — Perjelas logo untuk tas custom" },
      { name: "description", content: "Perbesar dan pertajam logo 2x atau 4x langsung di browser, gratis tanpa server." },
      { property: "og:title", content: "Penjernih Logo" },
      { property: "og:description", content: "Perbesar dan pertajam logo langsung di browser." },
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

  const pick = (f?: File) => {
    if (!f) return;
    if (!/image\/(png|jpe?g)/.test(f.type)) return setErr("Format harus PNG atau JPG.");
    setErr("");
    setFile(f);
    setBefore(URL.createObjectURL(f));
    setAfter(null);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const img = await loadImage(file);
      if (img.naturalWidth * scale > 8000 || img.naturalHeight * scale > 8000)
        throw new Error("Gambar terlalu besar untuk skala ini. Coba 2x atau gambar lebih kecil.");
      const blob = await upscale(img, scale);
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
          <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <p className="font-medium text-foreground">{file ? file.name : "Seret gambar ke sini"}</p>
          <p className="mt-1 text-sm text-muted-foreground">atau</p>
          <span className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Pilih File</span>
          <p className="mt-3 text-xs text-muted-foreground">PNG atau JPG</p>
        </div>

        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
          💡 Cocok untuk logo sederhana. Untuk foto kompleks, hasil terbatas.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-lg border border-border bg-card p-1">
            {[2, 4].map((s) => (
              <button key={s} onClick={() => { setScale(s); setAfter(null); }}
                className={`flex-1 rounded-md px-6 py-2 text-sm font-medium transition-colors ${scale === s ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}>
                {s}x
              </button>
            ))}
          </div>
          <button onClick={run} disabled={!file || busy}
            className="flex-1 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
            {busy ? "Memproses…" : "Jernihkan Logo"}
          </button>
        </div>

        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

        {before && after && (
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
            <button onClick={download} className="mt-4 w-full rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">
              Download PNG
            </button>
          </section>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground">Semua proses di perangkat Anda. Gambar tidak diunggah ke mana pun.</footer>
      </div>
    </main>
  );
}
