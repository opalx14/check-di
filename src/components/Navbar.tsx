"use client";

import { useI18n } from "@/lib/i18n";
import { Boxes, QrCode } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { WalletStatus } from "./wallet/WalletStatus";

export function Navbar() {
  const { dict } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#07090e]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a href="/#top" className="group flex items-center gap-2.5">
          <div className="size-9 overflow-hidden rounded-xl border border-cyan-500/25 bg-slate-950/80 transition group-hover:border-cyan-400/50">
            <img src="/check-di-logo.svg" alt="Check-Di logo" className="size-full object-cover" />
          </div>
          <div>
            <p className="font-display text-sm font-bold tracking-tight text-white">Check-Di</p>
            <p className="hidden text-[9px] text-slate-500 sm:block">Trace product journey</p>
          </div>
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="/#journey" className="text-xs font-medium text-slate-400 transition hover:text-white">{dict.nav.journey}</a>
          <a
            href="/supplier"
            data-tour="supplier"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 transition hover:text-cyan-300"
          >
            <Boxes className="size-3.5" />
            Kho sản phẩm
          </a>
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <div data-tour="wallet">
            <WalletStatus />
          </div>
          <LanguageSwitcher />
          <a
            href="/scan"
            data-tour="scan"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-cyan-300"
          >
            <QrCode className="size-4" />
            Quét QR
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <a
            href="/supplier"
            data-tour="supplier-mobile"
            aria-label="Kho sản phẩm"
            className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300"
          >
            <Boxes className="size-4" />
          </a>
          <div data-tour="wallet-mobile">
            <WalletStatus mobile />
          </div>
          <LanguageSwitcher />
          <a
            href="/scan"
            data-tour="scan-mobile"
            aria-label="Quét QR"
            className="flex size-9 items-center justify-center rounded-xl bg-cyan-400 text-slate-950"
          >
            <QrCode className="size-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
