"use client";

import {
  Boxes,
  Camera,
  ChevronLeft,
  ChevronRight,
  QrCode,
  ShoppingBag,
  Signature,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "check_di_onboarding_v3";
const ROLE_KEY = "check_di_role_v1";

type Role = "supplier" | "client";
type TargetRect = { top: number; left: number; width: number; height: number; bottom: number };
type TourStep = { target?: string; mobileTarget?: string; title: string; text: string; icon: typeof Sparkles; finalHref?: string };

function readTargetRect(selector?: string): TargetRect | null {
  if (!selector) return null;
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom };
}

export function GettingStartedSection() {
  const { locale } = useI18n();
  const vi = locale === "vi";
  const [visible, setVisible] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const copy = vi
    ? {
        skip: "Bỏ qua",
        back: "Quay lại",
        next: "Tiếp theo",
        chooseTitle: "Bạn dùng Check-Di để làm gì?",
        chooseText: "Chọn đúng vai trò để xem luồng phù hợp.",
        supplier: "Nhà cung cấp",
        supplierText: "Tạo sản phẩm, ghi hành trình, ký xác nhận và phát QR.",
        client: "Người mua",
        clientText: "Quét QR để xem sản phẩm đã đi qua những chặng nào.",
        openSupplier: "Mở kho sản phẩm",
        openClient: "Mở máy quét QR",
      }
    : {
        skip: "Skip",
        back: "Back",
        next: "Next",
        chooseTitle: "How will you use Check-Di?",
        chooseText: "Choose a role to see the right flow.",
        supplier: "Supplier",
        supplierText: "Create products, record stages, sign confirmations and publish QR.",
        client: "Consumer",
        clientText: "Scan QR to see each stage a product has passed through.",
        openSupplier: "Open product inventory",
        openClient: "Open QR scanner",
      };

  const branchSteps = useMemo<TourStep[]>(() => {
    if (role === "supplier") {
      return [
        {
          target: '[data-tour="supplier"]',
          mobileTarget: '[data-tour="supplier-mobile"]',
          title: vi ? "Kho sản phẩm" : "Product inventory",
          text: vi ? "Mọi lô bạn đã tạo nằm ở đây, kèm trạng thái và QR công khai." : "All created batches live here with status and public QR.",
          icon: Boxes,
        },
        {
          title: vi ? "Email mở đúng kho của nhà sản xuất" : "Email opens the producer workspace",
          text: vi ? "Bản demo có sẵn tài khoản producer.demo@check-di.local để vào đúng kho sản phẩm." : "The demo account producer.demo@check-di.local opens its own product inventory.",
          icon: ShoppingBag,
        },
        {
          target: '[data-tour="wallet"]',
          mobileTarget: '[data-tour="wallet-mobile"]',
          title: vi ? "Ví tổ chức" : "Organization wallet",
          text: vi ? "Liên kết Phantom một lần để ký xác nhận các chặng." : "Link Phantom once to sign stage confirmations.",
          icon: Wallet,
        },
        {
          title: vi ? "Tạo một lô sản phẩm" : "Create a product batch",
          text: vi ? "Chọn dưa hấu, thanh long hoặc hơn 20 loại trái cây rồi nhập vùng sản xuất." : "Choose a product and origin; more than 20 fruit types are ready for the demo.",
          icon: ShoppingBag,
        },
        {
          title: vi ? "Chụp ảnh thật trước khi ký" : "Capture the real product before signing",
          text: vi ? "Ảnh nháp được chụp lại hoặc bỏ. Khi đã ký thì ảnh + SHA-256 trở thành lịch sử." : "Draft photos can be retaken. After signing, the photo hash becomes immutable history.",
          icon: Camera,
        },
        {
          title: vi ? "Phantom ký và tạo TXID thật" : "Phantom signs and creates a real TXID",
          text: vi ? "Phantom ký eventHash rồi ký Registry transaction trên Solana Devnet; QR mở hành trình cho người mua." : "Phantom signs the event hash and Registry transaction on Solana Devnet, then the QR becomes public.",
          icon: Signature,
          finalHref: "/supplier",
        },
      ];
    }

    if (role === "client") {
      return [
        {
          target: '[data-tour="scan"]',
          mobileTarget: '[data-tour="scan-mobile"]',
          title: vi ? "Quét QR trên sản phẩm" : "Scan the product QR",
          text: vi ? "Không cần đăng nhập. Mở camera hoặc nhập mã lô." : "No sign-in required. Open camera or enter the batch code.",
          icon: QrCode,
        },
        {
          title: vi ? "Xem toàn bộ hành trình" : "View the full journey",
          text: vi ? "Timeline cho biết nguồn gốc, đơn vị xác nhận, chứng từ và proof." : "The timeline shows origin, confirming parties, documents and proof.",
          icon: ShoppingBag,
          finalHref: "/scan",
        },
      ];
    }

    return [];
  }, [role, vi]);

  useEffect(() => {
    try {
      const force = new URLSearchParams(window.location.search).get("tour") === "1";
      const done = localStorage.getItem(STORAGE_KEY) === "done";
      if (force || !done) {
        const timer = window.setTimeout(() => setVisible(true), 350);
        return () => window.clearTimeout(timer);
      }
    } catch {
      const timer = window.setTimeout(() => setVisible(true), 350);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !role || stepIndex === 0) {
      setTargetRect(null);
      return;
    }

    function sync() {
      const step = branchSteps[stepIndex - 1];
      if (!step) return setTargetRect(null);
      const isMobile = window.innerWidth < 768;
      const selector = isMobile && step.mobileTarget ? step.mobileTarget : step.target;
      setTargetRect(readTargetRect(selector));
    }

    sync();
    const raf = requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sync);
    };
  }, [branchSteps, role, stepIndex, visible]);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
      if (role) localStorage.setItem(ROLE_KEY, role);
    } catch {
      // Dismissal still works without storage.
    }
    setVisible(false);
  }

  function chooseRole(nextRole: Role) {
    setRole(nextRole);
    setStepIndex(1);
    try {
      localStorage.setItem(ROLE_KEY, nextRole);
    } catch {
      // Ignore storage errors.
    }
  }

  if (!visible) return null;

  const activeStep = role && stepIndex > 0 ? branchSteps[stepIndex - 1] : null;
  const total = role ? branchSteps.length + 1 : 1;
  const isLast = Boolean(role && stepIndex === branchSteps.length);
  const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
  const cardWidth = 380;
  const cardStyle = targetRect
    ? {
        left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - cardWidth / 2, viewportWidth - cardWidth - 16)),
        top: targetRect.bottom + 190 < viewportHeight ? targetRect.bottom + 14 : Math.max(16, targetRect.top - 210),
        width: Math.min(cardWidth, viewportWidth - 32),
      }
    : undefined;

  const Icon = activeStep?.icon ?? Sparkles;

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-2xl border-2 border-cyan-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.78),0_0_28px_rgba(34,211,238,0.45)]"
          style={{ top: targetRect.top - 7, left: targetRect.left - 7, width: targetRect.width + 14, height: targetRect.height + 14 }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-[3px]" />
      )}

      <button
        type="button"
        onClick={dismiss}
        className="fixed right-4 top-4 z-[122] inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-300"
      >
        <X className="size-3.5" /> {copy.skip}
      </button>

      <div
        className={`${targetRect ? "fixed" : "absolute left-1/2 top-1/2 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2"} z-[121] overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] shadow-2xl shadow-black/50`}
        style={targetRect ? cardStyle : undefined}
      >
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400" />
        <div className="p-5 sm:p-6">
          {stepIndex === 0 ? (
            <>
              <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                <Sparkles className="size-5" />
              </div>
              <h2 className="font-display mt-4 text-2xl font-extrabold text-white">{copy.chooseTitle}</h2>
              <p className="mt-2 text-sm text-slate-400">{copy.chooseText}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => chooseRole("supplier")}
                  className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] p-4 text-left transition hover:bg-cyan-500/10"
                >
                  <Boxes className="size-5 text-cyan-300" />
                  <p className="mt-3 text-sm font-bold text-white">{copy.supplier}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{copy.supplierText}</p>
                </button>
                <button
                  type="button"
                  onClick={() => chooseRole("client")}
                  className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-left transition hover:bg-emerald-500/10"
                >
                  <QrCode className="size-5 text-emerald-300" />
                  <p className="mt-3 text-sm font-bold text-white">{copy.client}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{copy.clientText}</p>
                </button>
              </div>
            </>
          ) : activeStep ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                  <Icon className="size-5" />
                </div>
                <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] text-slate-400">{stepIndex + 1}/{total}</span>
              </div>
              <h2 className="font-display mt-4 text-xl font-extrabold text-white">{activeStep.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{activeStep.text}</p>

              <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
                <button
                  type="button"
                  onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <ChevronLeft className="size-4" /> {copy.back}
                </button>
                {isLast && activeStep.finalHref ? (
                  <a
                    href={activeStep.finalHref}
                    onClick={dismiss}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-extrabold text-slate-950"
                  >
                    {role === "supplier" ? copy.openSupplier : copy.openClient}
                    <ChevronRight className="size-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStepIndex((value) => value + 1)}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-extrabold text-slate-950"
                  >
                    {copy.next}
                    <ChevronRight className="size-4" />
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
