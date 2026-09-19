"use client";

import {
  ArrowRight,
  Camera,
  CameraOff,
  QrCode,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TourGuide, type TourStep } from "@/components/TourGuide";
import { parseCheckDiScanValue } from "@/lib/client-scan";
import { useI18n } from "@/lib/i18n";
import {
  PRODUCT_CATALOG,
  PRODUCT_VISUAL_EXAMPLES,
} from "@/lib/product-visuals";

type Detector = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

declare global {
  interface Window {
    BarcodeDetector?: DetectorConstructor;
  }
}

export function ClientScanner() {
  const router = useRouter();
  const { t } = useI18n();
  const scanTourSteps: TourStep[] = [
    {
      target: '[data-tour="scan-camera-btn"]',
      title: t("consumerScan.tourCameraTitle"),
      description: t("consumerScan.tourCameraDescription"),
    },
    {
      target: '[data-tour="scan-input-form"]',
      title: t("consumerScan.tourInputTitle"),
      description: t("consumerScan.tourInputDescription"),
    },
    {
      target: '[data-tour="scan-sample-gallery"]',
      title: t("consumerScan.tourGalleryTitle"),
      description: t("consumerScan.tourGalleryDescription"),
      actionLabel: t("consumerScan.tourGalleryAction"),
      actionHref: "/verify/DUR-260830-01?tour=1",
    },
  ];
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [code, setCode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  function openPublicId(value: string) {
    const publicId = parseCheckDiScanValue(value);
    if (!publicId) return;
    stopCamera();
    router.push(`/verify/${encodeURIComponent(publicId)}`);
  }

  function stopCamera() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function startCamera() {
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("consumerScan.cameraUnsupported"));
      return;
    }

    if (!window.BarcodeDetector) {
      setCameraError(t("consumerScan.qrUnsupported"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const scan = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const first = codes[0]?.rawValue;
          if (first) {
            openPublicId(first);
            return;
          }
        } catch {
          // Keep scanning; some frames are not decodable.
        }
        frameRef.current = requestAnimationFrame(scan);
      };
      frameRef.current = requestAnimationFrame(scan);
    } catch {
      setCameraError(t("consumerScan.cameraOpenFailed"));
      stopCamera();
    }
  }

  useEffect(() => () => stopCamera(), []);

  return (
    <main className="min-h-screen bg-[#07090e] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-white/8 pb-5">
          <a href="/" className="font-display font-bold text-white">Check-Di</a>
          <div className="flex items-center gap-3">
            <a href="/supplier" className="text-xs font-semibold text-slate-400 hover:text-white">{t("consumerScan.supplierQuestion")}</a>
            <LanguageSwitcher />
          </div>
        </header>

        <section className="mx-auto mt-10 max-w-3xl text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
            <QrCode className="size-5" />
          </div>
          <h1 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">{t("consumerScan.title")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 sm:text-base">{t("consumerScan.description")}</p>
        </section>

        <section className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] shadow-2xl shadow-black/25">
          {cameraOpen ? (
            <div className="relative aspect-[4/3] overflow-hidden bg-black sm:aspect-video">
              <video ref={videoRef} muted playsInline className="size-full object-cover" />
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10">
                <div className="size-48 rounded-3xl border-2 border-cyan-300/90 shadow-[0_0_0_999px_rgba(0,0,0,0.35)] sm:size-60" />
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur"
                aria-label={t("consumerScan.closeCamera")}
              >
                <X className="size-4" />
              </button>
              <div className="absolute inset-x-0 bottom-4 text-center text-xs font-semibold text-white drop-shadow">{t("consumerScan.frameHint")}</div>
            </div>
          ) : (
            <div className="p-5 sm:p-7">
              <button
                type="button"
                onClick={startCamera}
                data-tour="scan-camera-btn"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-4 text-sm font-bold text-slate-950"
              >
                <Camera className="size-4" />
                {t("consumerScan.openCamera")}
              </button>

              {cameraError && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-100/80">
                  <CameraOff className="size-4 shrink-0" />
                  {cameraError}
                </div>
              )}

              <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-600">
                <span className="h-px flex-1 bg-white/8" />
                {t("consumerScan.orEnterCode")}
                <span className="h-px flex-1 bg-white/8" />
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  openPublicId(code);
                }}
                data-tour="scan-input-form"
                className="flex flex-col gap-2 sm:flex-row"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={t("consumerScan.placeholder")}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 font-mono text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/40"
                  />
                </div>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/8 px-5 py-3 text-sm font-bold text-white">
                  {t("consumerScan.lookup")}
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </div>
          )}
        </section>

        <section className="mx-auto mt-10 max-w-5xl" data-tour="scan-sample-gallery">
          <div className="flex items-center gap-2 text-emerald-300">
            <ShieldCheck className="size-4" />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em]">{t("consumerScan.traceableProducts")}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PRODUCT_VISUAL_EXAMPLES.map((product) => (
              <article key={product.name} className="overflow-hidden rounded-2xl border border-white/8 bg-[#0b111c]">
                <img src={product.visual.imageUrl} alt={product.name} className="h-32 w-full object-cover" />
                <div className="p-3">
                  <p className="text-sm font-bold text-white">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.origin}</p>
                  {product.name.includes("Sầu riêng") && (
                    <button
                      type="button"
                      onClick={() => openPublicId("DUR-260830-01")}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300"
                    >
                      {t("consumerScan.openLiveBatch")}
                      <ArrowRight className="size-3.5" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold text-slate-300">{t("consumerScan.sampleCatalog")} · {t("consumerScan.fruitCount", { count: PRODUCT_CATALOG.filter((item) => item.category === "fruit").length })}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRODUCT_CATALOG.filter((item) => item.category === "fruit").map((item) => (
                <span key={item.name} className="rounded-full border border-white/8 bg-slate-950/60 px-2.5 py-1 text-[10px] text-slate-400">
                  {item.emoji} {item.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      <TourGuide
        tourKey="consumer_scan"
        flowTitle={t("consumerScan.tourFlowTitle")}
        role="consumer"
        steps={scanTourSteps}
      />
    </main>
  );
}
