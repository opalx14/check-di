"use client";

import { useI18n } from "@/lib/i18n";
import { QrCode } from "lucide-react";

export function Footer() {
  const { dict } = useI18n();

  return (
    <footer className="border-t border-white/5 bg-[#05070d] py-10 text-xs text-slate-500">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
            <QrCode className="size-4" />
          </div>
          <div>
            <p className="font-display font-bold text-white">{dict.footer.brandTitle}</p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">{dict.footer.brandTagline}</p>
          </div>
        </div>
        <p className="font-mono text-[11px] text-slate-500">{dict.footer.copyright}</p>
      </div>
    </footer>
  );
}
