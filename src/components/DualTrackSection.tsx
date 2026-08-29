"use client";

import React, { useState } from "react";
import {
  Code2,
  Briefcase,
  Layers,
  CheckCircle2,
  Shield,
  Cpu,
  TrendingUp,
  Award,
  ArrowRight,
} from "lucide-react";

export function DualTrackSection() {
  const [activeTrack, setActiveTrack] = useState<"tech" | "product">("tech");

  return (
    <section id="two-tracks" className="relative py-20 sm:py-28 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-3.5 py-1 text-xs font-semibold text-purple-300 backdrop-blur">
            <Layers className="size-3.5" />
            <span>UniHackFest 2026 Strategy</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Hai Tracks thi đấu · Dùng chung một Core
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Check-Di không fork hai sản phẩm riêng biệt. Chúng tôi phát triển một nền tảng thống nhất
            với chiều sâu kỹ thuật (Technical Depth) và mô hình kinh doanh khả thi (Business Viability).
          </p>
        </div>

        {/* Track Toggle Buttons */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-2xl border border-white/10 bg-slate-900/80 p-1.5 backdrop-blur-xl">
            <button
              onClick={() => setActiveTrack("tech")}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold transition-all sm:text-sm ${
                activeTrack === "tech"
                  ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Code2 className="size-4" />
              <span>Technical Build Track</span>
            </button>
            <button
              onClick={() => setActiveTrack("product")}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold transition-all sm:text-sm ${
                activeTrack === "product"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className="size-4" />
              <span>Product & Business Track</span>
            </button>
          </div>
        </div>

        {/* Track Showcase Box */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#0b101f]/90 p-6 backdrop-blur-2xl sm:p-10">
          {activeTrack === "tech" ? (
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              {/* Left Column: Tech Highlights */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/20">
                  <Cpu className="size-3.5" />
                  <span>Technical Execution & Engineering Excellence</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white sm:text-3xl">
                  AI Rubric Mapping & Solana Anchor Program
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  Track Kỹ thuật tập trung vào thuật toán trích dẫn bằng chứng AST, cấu trúc Merkle
                  Tree cam kết tính toàn vẹn và Program Anchor trên Solana Devnet với cơ chế PDA tối ưu.
                </p>

                <div className="space-y-3">
                  {[
                    {
                      title: "Deterministic AI Evidence Engine",
                      desc: "AST & Git commit parsing với strict schema, triệt tiêu ảo giác (zero hallucination).",
                    },
                    {
                      title: "Solana Anchor Registry (Devnet)",
                      desc: "Smart contract lưu trữ issuer authority, subject commitment, evidence root và status.",
                    },
                    {
                      title: "Tamper-Proof Merkle Commitments",
                      desc: "Tạo root hash SHA-256 từ danh sách bằng chứng để xác minh độc lập tức thì.",
                    },
                    {
                      title: "Automated Test Coverage",
                      desc: "Bộ test suite toàn diện cho AI parser, API Route handlers và Anchor smart contract.",
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-xl bg-slate-900/60 p-3.5 border border-white/5">
                      <CheckCircle2 className="size-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Code & Architecture Snippet */}
              <div className="rounded-2xl border border-white/10 bg-[#050811] p-5 font-mono text-xs shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-slate-400 text-[11px]">
                  <span>programs/check_di_registry/src/lib.rs</span>
                  <span className="text-cyan-400">Anchor v0.30</span>
                </div>
                <pre className="mt-4 overflow-x-auto text-[11px] leading-relaxed text-slate-300">
                  <code>{`#[account]
pub struct Attestation {
    pub issuer: Pubkey,               // 32 bytes
    pub subject_commitment: [u8; 32], // 32 bytes (Hash PII)
    pub evidence_root: [u8; 32],      // 32 bytes (Merkle root)
    pub assessment_hash: [u8; 32],    // 32 bytes (AI + Review)
    pub rubric_hash: [u8; 32],        // 32 bytes (Rubric ID)
    pub issued_at: i64,               // 8 bytes (Timestamp)
    pub status: AttestationStatus,    // 1 byte (Active/Revoked)
    pub version: u8,                  // 1 byte
}

// Seeds: ["attestation", issuer.key(), subject_commitment]`}</code>
                </pre>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Rent Exempt Size: 178 bytes</span>
                  <span className="text-emerald-400 font-semibold">Devnet Verified</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              {/* Left Column: Product Highlights */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/20">
                  <TrendingUp className="size-3.5" />
                  <span>Market Fit & Sustainable Economics</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white sm:text-3xl">
                  Thị trường Tuyển dụng & Pilot Issuer Model
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  Track Sản phẩm tập trung vào việc loại bỏ 70% thời gian phỏng vấn sàng lọc năng lực
                  kỹ thuật, trao quyền cho các tổ chức đào tạo/hackathon cấp chứng chỉ uy tín.
                </p>

                <div className="space-y-3">
                  {[
                    {
                      title: "Giải quyết vấn nạn CV chém gió",
                      desc: "Nhà tuyển dụng không còn phải nghi ngờ CV khi mọi claim đều có link dẫn chứng thực tế.",
                    },
                    {
                      title: "Pilot Issuer Network",
                      desc: "Mô hình thí điểm cho các trường đại học, trại lập trình (bootcamps) và các cuộc thi Hackathon.",
                    },
                    {
                      title: "Quyền riêng tư tuyệt đối (GDPR & Zero-PII)",
                      desc: "Không đưa tên tuổi, email hay mã nguồn nhạy cảm lên blockchain; chỉ lưu cryptographic hashes.",
                    },
                    {
                      title: "Mô hình Doanh thu B2B SaaS Bền vững",
                      desc: "Không phát hành token đầu cơ, không thu phí crypto phức tạp; thu phí API verification cho doanh nghiệp.",
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-xl bg-slate-900/60 p-3.5 border border-white/5">
                      <CheckCircle2 className="size-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Business Metrics Card */}
              <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-6 shadow-2xl space-y-5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider text-purple-300">
                  Giá trị cốt lõi cho các bên tham gia (Stakeholders)
                </h4>

                <div className="space-y-3">
                  <div className="rounded-xl border border-white/5 bg-slate-900/80 p-4">
                    <p className="text-xs font-bold text-cyan-300">Dành cho Builders / Lập trình viên</p>
                    <p className="text-xs text-slate-300 mt-1">
                      Chứng minh năng lực qua sản phẩm thực tế thay vì làm bài test LeetCode sáo rỗng.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-900/80 p-4">
                    <p className="text-xs font-bold text-purple-300">Dành cho Issuers / Mentor / Đơn vị tổ chức</p>
                    <p className="text-xs text-slate-300 mt-1">
                      Tiết kiệm 80% thời gian chấm bài nhờ AI bóc tách rubric tự động trước khi ký duyệt.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-900/80 p-4">
                    <p className="text-xs font-bold text-emerald-300">Dành cho Nhà tuyển dụng / Verifiers</p>
                    <p className="text-xs text-slate-300 mt-1">
                      Xác thực năng lực chỉ trong 1 giây qua Solana Devnet mà không cần gọi điện thẩm vấn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
