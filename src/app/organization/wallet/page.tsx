"use client";

import { CheckCircle2, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { CheckDiOrganizationMembership } from "@/lib/auth/server";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signMessage(
    message: Uint8Array,
    display?: "utf8",
  ): Promise<{ signature: Uint8Array; publicKey?: { toString(): string } }>;
};

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
  }
}

type MePayload = {
  ok: boolean;
  memberships?: CheckDiOrganizationMembership[];
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export default function OrganizationWalletPage() {
  const [memberships, setMemberships] = useState<CheckDiOrganizationMembership[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ownerMemberships = useMemo(
    () => memberships.filter((membership) => membership.role === "owner"),
    [memberships],
  );
  const selected = ownerMemberships.find(
    (membership) => membership.organizationId === organizationId,
  );

  async function loadMemberships() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = (await response.json()) as MePayload;
      if (!response.ok || !payload.ok) {
        setError("Bạn cần đăng nhập tài khoản tổ chức trước khi liên kết Phantom.");
        setMemberships([]);
        return;
      }
      const nextMemberships = payload.memberships ?? [];
      setMemberships(nextMemberships);
      const firstOwner = nextMemberships.find((membership) => membership.role === "owner");
      setOrganizationId((current) => current || firstOwner?.organizationId || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMemberships();
  }, []);

  async function linkWallet() {
    if (!organizationId) return;
    setLinking(true);
    setError(null);
    setMessage(null);

    try {
      const provider = window.phantom?.solana;
      if (!provider?.isPhantom) {
        throw new Error("phantom_not_found");
      }

      const connected = await provider.connect();
      const publicKey = connected.publicKey.toString();
      const challengeResponse = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const challenge = (await challengeResponse.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!challengeResponse.ok || !challenge.message) {
        throw new Error(challenge.error || "challenge_failed");
      }

      const signed = await provider.signMessage(
        new TextEncoder().encode(challenge.message),
        "utf8",
      );
      const verifyResponse = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          publicKey,
          signatureBase64: bytesToBase64(signed.signature),
        }),
      });
      const verified = (await verifyResponse.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!verifyResponse.ok || !verified.ok) {
        throw new Error(verified.error || "wallet_verification_failed");
      }

      setMessage("Phantom đã được xác minh và liên kết với organization.");
      await loadMemberships();
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "unknown_error";
      setError(
        code === "phantom_not_found"
          ? "Không tìm thấy Phantom trên trình duyệt này."
          : "Không thể xác minh ví. Hãy kiểm tra đúng tài khoản organization và ký lại challenge.",
      );
    } finally {
      setLinking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="text-sm text-slate-400 hover:text-white">← Check-Di</a>
        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]/95">
          <div className="border-b border-white/10 p-5 sm:p-7">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
              <Wallet className="size-5" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-white">Ví xác nhận của organization</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Phantom chỉ ký một challenge để chứng minh quyền sở hữu ví. Bước này không gửi SOL và không tạo giao dịch thanh toán.
            </p>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="size-4 animate-spin" />Đang đọc organization...</div>
            ) : ownerMemberships.length === 0 ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-100/80">
                Cần đăng nhập bằng membership role <strong>owner</strong>. <a className="underline" href="/login?next=/organization/wallet">Đăng nhập</a>
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-slate-300">
                  Organization
                  <select
                    value={organizationId}
                    onChange={(event) => setOrganizationId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  >
                    {ownerMemberships.map((membership) => (
                      <option key={membership.organizationId} value={membership.organizationId}>
                        {membership.organizationName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wallet hiện tại</p>
                  <p className="mt-2 break-all font-mono text-sm text-cyan-200">
                    {selected?.walletPublicKey || "Chưa liên kết Phantom"}
                  </p>
                </div>

                <div className="flex items-start gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3 text-xs leading-relaxed text-cyan-100/80">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  Challenge chứa organization, user, nonce và Devnet context; server kiểm tra chữ ký Ed25519 trước khi lưu public key.
                </div>

                <button
                  type="button"
                  onClick={linkWallet}
                  disabled={linking}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white hover:bg-violet-400 disabled:opacity-60"
                >
                  {linking ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
                  {linking ? "Đang xác minh Phantom..." : selected?.walletPublicKey ? "Xác minh lại / đổi Phantom" : "Liên kết Phantom"}
                </button>
              </>
            )}

            {message && (
              <p className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                <CheckCircle2 className="size-4" />{message}
              </p>
            )}
            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
