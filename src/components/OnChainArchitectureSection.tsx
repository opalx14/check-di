"use client";

import React from "react";
import { ShieldCheck, Database, Lock, Key, Cpu, Server, CheckCircle2 } from "lucide-react";
import { ON_CHAIN_FIELDS, SOLANA_NETWORK, SOLANA_RPC_URL, CHECK_DI_PROGRAM_NAME } from "@/lib/solana/config";

export function OnChainArchitectureSection() {
  return (
    <section id="onchain" className="relative py-20 sm:py-28 border-t border-white/5 bg-[#070a13]/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-semibold text-emerald-300 backdrop-blur">
            <ShieldCheck className="size-3.5" />
            <span>Solana Devnet Program</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Cấu trúc On-chain PDA & Bảo mật Dữ liệu
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Check-Di thiết kế on-chain account theo chuẩn tối giản nhất: chỉ lưu các hashes và
            commitments cần thiết cho việc đối soát tính toàn vẹn (Integrity Proof).
          </p>
        </div>

        {/* 2-Column Specs Layout */}
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Left: On-chain Struct Breakdown */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Database className="size-4.5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  {CHECK_DI_PROGRAM_NAME} :: Attestation
                </h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                Network: {SOLANA_NETWORK}
              </span>
            </div>

            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              Mỗi chứng chỉ được lưu trữ dưới dạng một <strong>Program Derived Address (PDA)</strong>{" "}
              với seed duy nhất: <code className="text-cyan-300 font-mono">[&quot;attestation&quot;, issuer, subject_commitment]</code>.
            </p>

            {/* Field Table */}
            <div className="mt-6 space-y-2 font-mono text-xs">
              {ON_CHAIN_FIELDS.map((field, idx) => (
                <div
                  key={field}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-[#050811] p-3 text-slate-300"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-slate-500 font-bold">#{idx + 1}</span>
                    <span className="font-bold text-cyan-300">{field}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {field === "issuer"
                      ? "Pubkey (32 B)"
                      : field.includes("hash") || field.includes("root") || field.includes("commitment")
                      ? "[u8; 32] (SHA-256)"
                      : field === "issued_at"
                      ? "i64 (Unix Timestamp)"
                      : field === "status"
                      ? "enum AttestationStatus (1 B)"
                      : "u8 (Version)"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-white/10">
              <span>Solana RPC Endpoint:</span>
              <span className="font-mono text-cyan-400 truncate max-w-[200px]">{SOLANA_RPC_URL}</span>
            </div>
          </div>

          {/* Right: Data Boundary & Privacy Invariants */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl sm:p-8">
              <div className="flex items-center gap-2 text-amber-400">
                <Lock className="size-4.5" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Ranh giới Dữ liệu Tuyệt đối (Data Boundaries)
                </h3>
              </div>

              <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-300">
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
                  <h4 className="font-bold text-amber-300">1. Không bao giờ lưu PII on-chain</h4>
                  <p className="mt-1 text-slate-300">
                    Họ tên, email, CCCD/hộ chiếu, số điện thoại hoặc mã nguồn riêng tư của ứng viên
                    không bao giờ được gửi lên blockchain. Chỉ có giá trị băm (Hash commitment) được lưu.
                  </p>
                </div>

                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                  <h4 className="font-bold text-cyan-300">2. Quyền thu hồi & Cập nhật (Supersede)</h4>
                  <p className="mt-1 text-slate-300">
                    Issuer có thể chuyển trạng thái chứng chỉ sang <code className="text-cyan-200">Revoked</code>{" "}
                    hoặc nâng cấp sang version mới thông qua instruction <code className="text-cyan-200">supersede_attestation</code>.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                  <h4 className="font-bold text-emerald-300">3. Chi phí vận hành tối ưu</h4>
                  <p className="mt-1 text-slate-300">
                    Nhờ kích thước tài khoản nhỏ gọn (~178 bytes), chi phí rent-exempt cho mỗi chứng
                    chỉ trên Solana chỉ dưới $0.001 USD, hoàn toàn khả thi cho quy mô triệu chứng chỉ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
