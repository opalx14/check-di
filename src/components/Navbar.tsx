"use client";

import { Menu, QrCode, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  ["#journey", "Hành trình"],
  ["#demo", "Demo truy xuất"],
  ["#participants", "Dành cho ai"],
  ["#technology", "Công nghệ"],
  ["#safety", "An toàn dữ liệu"],
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#07090e]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 font-black text-cyan-300">
            CĐ
          </div>
          <div>
            <p className="font-bold text-white">Check-Di</p>
            <p className="hidden text-[11px] text-slate-400 sm:block">Truy xuất nguồn gốc theo từng chặng</p>
          </div>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map(([href, label]) => (
            <a key={href} href={href} className="text-xs font-medium text-slate-300 transition hover:text-cyan-300">
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#demo"
          className="hidden items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 md:inline-flex"
        >
          <QrCode className="size-4" />
          Quét thử sản phẩm
        </a>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg p-2 text-slate-300 md:hidden"
          aria-label="Mở menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 bg-[#090d16] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_ITEMS.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="text-sm text-slate-200">
                {label}
              </a>
            ))}
            <a
              href="#demo"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-slate-950"
            >
              <QrCode className="size-4" />
              Quét thử sản phẩm
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
