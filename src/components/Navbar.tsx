"use client";

import { useI18n } from "@/lib/i18n";
import { Plus, QrCode } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { WalletStatus } from "./wallet/WalletStatus";

export function Navbar() {
  const { dict } = useI18n();

  const navItems = [
    { href: "#journey", label: dict.nav.journey },
    { href: "#demo", label: dict.nav.demo },
    { href: "#participants", label: dict.nav.participants },
    { href: "#technology", label: dict.nav.technology },
    { href: "#safety", label: dict.nav.safety },
    { href: "/judge", label: "Judge demo" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#07090e]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-3 group">
          <div className="size-10 overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-950/80 transition group-hover:border-cyan-400/50 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <img
              src="/check-di-logo.svg"
              alt="Check-Di logo"
              className="size-full object-cover"
            />
          </div>
          <div>
            <p className="font-display font-bold tracking-tight text-white">{dict.footer.brandTitle}</p>
            <p className="hidden text-[11px] font-mono text-slate-400 sm:block">{dict.footer.brandTagline}</p>
          </div>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-medium tracking-tight text-slate-300 transition hover:text-cyan-300"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div data-tour="wallet">
            <WalletStatus />
          </div>
          <a
            href="/batches/new"
            data-tour="create-batch"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-display text-xs font-semibold text-slate-200 transition hover:border-cyan-500/30 hover:text-cyan-200"
          >
            <Plus className="size-3.5" />
            {dict.nav.createBatch}
          </a>
          <LanguageSwitcher />
          <a
            href="#demo"
            data-tour="scan"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-display text-xs font-bold tracking-tight text-slate-950 transition hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            <QrCode className="size-4" />
            {dict.nav.tryScan}
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <WalletStatus mobile />
          <LanguageSwitcher />
          <a
            href="#demo"
            data-tour="scan-mobile"
            aria-label={dict.nav.tryScan}
            className="flex size-9 items-center justify-center rounded-xl bg-cyan-500 text-slate-950"
          >
            <QrCode className="size-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
