"use client";

import React from "react";
import { ShieldAlert, CheckCircle2, XCircle, Scale } from "lucide-react";

export function ComplianceBanner() {
  const boundaries = [
    { title: "No Token / Token Sale", desc: "Không phát hành token đầu cơ hay kêu gọi đầu tư." },
    { title: "No Crypto Custody", desc: "Không giữ private key hay tài sản của người dùng." },
    { title: "Zero PII On-chain", desc: "Thông tin cá nhân được bảo vệ nghiêm ngặt off-chain." },
    { title: "Human Final Decision", desc: "AI chỉ trích xuất dẫn chứng; con người quyết định cấp." },
  ];

  return (
    <section id="compliance" className="py-16 border-t border-white/5 bg-[#060810]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-[#080d1a] p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/20">
                <Scale className="size-3.5" />
                <span>Compliance & Product Boundary</span>
              </div>
              <h3 className="text-xl font-bold text-white sm:text-2xl">
                Cam kết Quản trị & Tuân thủ Pháp lý (UniHackFest 2026)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Check-Di được xây dựng với mục tiêu ứng dụng thực tế lâu dài, tuân thủ nghiêm ngặt các
                chuẩn mực an toàn thông tin và không chứa các yếu tố rủi ro tài chính.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-1/2">
              {boundaries.map((b, idx) => (
                <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-slate-950/60 p-3 text-xs">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">{b.title}</strong>
                    <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">{b.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
