"use client";

import React from "react";
import {
  FileCode2,
  Cpu,
  UserCheck,
  ShieldCheck,
  Search,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";

const FLOW_STEPS = [
  {
    step: "01",
    title: "Nộp Artifacts & Mã nguồn",
    englishTitle: "Artifact Ingestion",
    description:
      "Builder gửi đường dẫn Git repository, Pull Request, Commit hash, file PRD hoặc link demo. Hệ thống bóc tách AST và cấu trúc dữ liệu minh chứng.",
    badge: "Input Layer",
    icon: FileCode2,
    accent: "from-blue-500 to-cyan-500",
    points: ["GitHub PR & Commits", "PRD & Design Docs", "Live Demo endpoints"],
  },
  {
    step: "02",
    title: "AI Bóc tách & Khớp Rubric",
    englishTitle: "AI Evidence Engine",
    description:
      "Engine phân tích cú pháp, trích dẫn chính xác từng dòng code và đối chiếu với tiêu chí đánh giá (Rubric). Đánh dấu rõ ràng các điểm nghi vấn cần con người xem lại.",
    badge: "AI Decision Support",
    icon: Cpu,
    accent: "from-cyan-500 to-teal-500",
    points: ["Zero hallucination guardrails", "Trích dẫn dòng code thực", "Confidence score minh bạch"],
  },
  {
    step: "03",
    title: "Hội đồng Thẩm định & Ký duyệt",
    englishTitle: "Human Review & Sign-off",
    description:
      "Chuyên gia, giám khảo hoặc tổ chức đào tạo (Issuer) thẩm định kết quả, đối soát ghi chú và quyết định Phê duyệt, Yêu cầu bổ sung hoặc Từ chối.",
    badge: "Governance Layer",
    icon: UserCheck,
    accent: "from-purple-500 to-indigo-500",
    points: ["Quyết định tối hậu bởi con người", "Reviewer notes & chữ ký số", "Phân quyền Issuer rõ ràng"],
  },
  {
    step: "04",
    title: "Neo chứng chỉ lên Solana",
    englishTitle: "Solana Devnet Attestation",
    description:
      "Tạo cryptographic commitment (SHA-256 Merkle root) và lưu trữ trên Program Account (PDA) của Solana. Bảo đảm tính bất biến, không thể làm giả hay can thiệp.",
    badge: "Blockchain Integrity",
    icon: ShieldCheck,
    accent: "from-emerald-500 to-green-500",
    points: ["Anchor PDA state", "Zero PII on-chain", "Chi phí giao dịch cực thấp"],
  },
  {
    step: "05",
    title: "Xác minh Công khai Tức thì",
    englishTitle: "Instant Public Verify",
    description:
      "Nhà tuyển dụng, nhà tài trợ và cộng đồng có thể tra cứu và xác thực năng lực chỉ với 1 click hoặc quét QR, kiểm tra trạng thái Active/Revoked trong thời gian thực.",
    badge: "Trust & Verification",
    icon: Search,
    accent: "from-amber-500 to-orange-500",
    points: ["Tra cứu trong < 1s", "Kiểm tra chống giả mạo", "Quyền riêng tư tuyệt đối"],
  },
];

export function CoreFlowSection() {
  return (
    <section id="flow" className="relative py-20 sm:py-28 border-t border-white/5 bg-[#080c17]/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold text-cyan-300 backdrop-blur">
            <span>End-to-End Architecture</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Từ Artifact thực chiến đến Chứng chỉ Bất biến
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Check-Di giải quyết triệt để vấn đề &quot;CV chém gió&quot; bằng mô hình 5 bước khép kín:
            có bằng chứng dòng code, có AI đối soát, có con người chịu trách nhiệm và có Solana bảo chứng.
          </p>
        </div>

        {/* Step Grid Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FLOW_STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className={`group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/10 ${
                  index === 4 ? "md:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div>
                  {/* Top Bar with Number & Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 text-white font-mono font-black text-sm">
                        {item.step}
                      </div>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 border border-white/5">
                        {item.badge}
                      </span>
                    </div>
                    <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                      <Icon className="size-4.5" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-5">
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs font-mono text-cyan-400/80 mt-0.5">{item.englishTitle}</p>
                    <p className="mt-3 text-xs leading-relaxed text-slate-300">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Bullets */}
                <div className="mt-6 border-t border-white/5 pt-4 space-y-1.5">
                  {item.points.map((pt, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-400">
                      <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
