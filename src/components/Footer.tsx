import { QrCode } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#05070d] py-10 text-xs text-slate-500">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
            <QrCode className="size-4" />
          </div>
          <div>
            <p className="font-bold text-white">Check-Di</p>
            <p className="mt-0.5 text-[11px]">Truy xuất nguồn gốc theo từng chặng</p>
          </div>
        </div>
        <p className="text-[11px]">UniHackFest 2026 · Một core cho Technical Build và Product & Business</p>
      </div>
    </footer>
  );
}
