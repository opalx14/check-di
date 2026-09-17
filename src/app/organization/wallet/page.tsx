"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { CheckDiOrganizationMembership } from "@/lib/auth/server";
import { CHECK_DI_REGISTRY_PROGRAM_ID } from "@/lib/solana/config";

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
    solana?: PhantomProvider;
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

function shortAddress(address?: string) {
  if (!address) return "—";
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export default function OrganizationWalletPage() {
  const [memberships, setMemberships] = useState<CheckDiOrganizationMembership[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasPhantom, setHasPhantom] = useState<boolean | null>(null);
  const [browserConnectedKey, setBrowserConnectedKey] = useState<string | null>(null);

  const ownerMemberships = useMemo(
    () => memberships.filter((membership) => membership.role === "owner"),
    [memberships],
  );
  const selected = ownerMemberships.find(
    (membership) => membership.organizationId === organizationId,
  );

  function getProvider(): PhantomProvider | null {
    if (typeof window === "undefined") return null;
    const provider = window.phantom?.solana ?? window.solana;
    return provider?.isPhantom ? provider : null;
  }

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
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMemberships();
    // Check phantom extension presence
    const provider = getProvider();
    setHasPhantom(Boolean(provider));
    if (provider?.publicKey) {
      setBrowserConnectedKey(provider.publicKey.toString());
    }

    // Auto-sync on account change in Phantom
    if (provider && typeof (provider as any).on === "function") {
      (provider as any).on("accountChanged", (publicKey: any) => {
        setBrowserConnectedKey(publicKey ? publicKey.toString() : null);
        setError(null);
      });
    }
  }, []);

  async function connectPhantomBrowser() {
    setError(null);
    setMessage(null);
    const provider = getProvider();
    if (!provider) {
      setError("Không tìm thấy tiện ích Phantom trên trình duyệt.");
      return;
    }

    try {
      setLinking(true);
      const res = await provider.connect();
      const pubKey = res.publicKey.toString();
      setBrowserConnectedKey(pubKey);
      setMessage("Đã kết nối Phantom. Bấm xác minh để liên kết ví với tổ chức.");
    } catch (err) {
      setError("Người dùng đã hủy hoặc từ chối kết nối Phantom.");
    } finally {
      setLinking(false);
    }
  }

  async function linkWallet() {
    if (!organizationId) return;
    setLinking(true);
    setError(null);
    setMessage(null);

    try {
      const provider = getProvider();
      if (!provider) {
        throw new Error("phantom_not_found");
      }

      const connected = await provider.connect();
      const publicKey = connected.publicKey.toString();
      setBrowserConnectedKey(publicKey);

      const challengeResponse = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId }),
      });
      const challenge = (await challengeResponse.json()) as {
        ok?: boolean;
        message?: string;
        nonce?: string;
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
        credentials: "include",
        body: JSON.stringify({
          organizationId,
          publicKey,
          signatureBase64: bytesToBase64(signed.signature),
          nonce: challenge.nonce,
        }),
      });
      const verified = (await verifyResponse.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!verifyResponse.ok || !verified.ok) {
        throw new Error(verified.error || "wallet_verification_failed");
      }

      setMessage("Phantom đã được liên kết với tổ chức.");
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

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <a href="/supplier" className="text-xs font-semibold text-slate-400 hover:text-white">
            ← Kho sản phẩm
          </a>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-violet-300">
              SOLANA DEVNET
            </span>
          </div>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]/95 shadow-2xl">
          <div className="border-b border-white/10 p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
                <Wallet className="size-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-bold text-cyan-300">
                  <span className="size-1.5 rounded-full bg-cyan-400" />
                  Organization wallet
                </span>
              </div>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold text-white">Liên kết Phantom</h1>
            <p className="mt-2 text-sm text-slate-400">
              Ví này sẽ ký xác nhận các chặng của tổ chức.
            </p>

            {/* Network & Program info badges */}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <div className="rounded-lg border border-white/5 bg-slate-950/60 px-2.5 py-1 text-slate-400">
                Network: <span className="font-semibold text-emerald-300">Solana Devnet</span>
              </div>
              <a
                href={`https://explorer.solana.com/address/${encodeURIComponent(CHECK_DI_REGISTRY_PROGRAM_ID)}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-slate-950/60 px-2.5 py-1 text-slate-400 transition hover:border-cyan-500/30 hover:text-cyan-200"
              >
                Program: <span className="font-mono text-cyan-300">{shortAddress(CHECK_DI_REGISTRY_PROGRAM_ID)}</span>
                <ArrowUpRight className="size-3" />
              </a>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin text-violet-400" />
                Đang đọc thông tin organization...
              </div>
            ) : ownerMemberships.length === 0 ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-100/80">
                Cần đăng nhập bằng membership role <strong>owner</strong> để quản lý ví tổ chức.{" "}
                <a className="underline hover:text-white" href="/login?next=/organization/wallet">
                  Đăng nhập ngay
                </a>
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-slate-300">
                  Organization
                  <select
                    value={organizationId}
                    onChange={(event) => setOrganizationId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50"
                  >
                    {ownerMemberships.map((membership) => (
                      <option key={membership.organizationId} value={membership.organizationId}>
                        {membership.organizationName} ({membership.role})
                      </option>
                    ))}
                  </select>
                </label>

                {/* State 1: Phantom not detected */}
                {hasPhantom === false && (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm text-amber-100">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertCircle className="size-4" />
                      Phantom wallet not detected
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-amber-200/80">
                      Trình duyệt chưa cài đặt tiện ích Phantom extension. Bạn cần cài đặt Phantom để tiếp tục.
                    </p>
                    <a
                      href="https://phantom.app/"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
                    >
                      Install Phantom
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                )}

                {/* State 4: Verified */}
                {selected?.walletPublicKey ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                          <CheckCircle2 className="size-4" />
                          Wallet verified
                        </div>
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                          {shortAddress(selected.walletPublicKey)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/70 p-3">
                        <p className="break-all font-mono text-xs text-slate-200">
                          {selected.walletPublicKey}
                        </p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selected.walletPublicKey!)}
                          className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <a
                          href={`https://explorer.solana.com/address/${encodeURIComponent(selected.walletPublicKey)}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
                        >
                          View on Solana Explorer
                          <ExternalLink className="size-3" />
                        </a>
                        {browserConnectedKey && browserConnectedKey === selected.walletPublicKey && (
                          <span className="text-[11px] font-medium text-emerald-400">
                            ✓ Ví Phantom đang mở khớp với tổ chức
                          </span>
                        )}
                      </div>
                    </div>

                    {browserConnectedKey && browserConnectedKey !== selected.walletPublicKey && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                          <AlertCircle className="size-4 shrink-0" />
                          <span>Ví Phantom đang mở khác ví tổ chức</span>
                        </div>
                        <p className="mt-1 text-amber-200/90">
                          Ví trong Phantom: <span className="font-mono">{shortAddress(browserConnectedKey)}</span>. Bấm nút bên dưới nếu bạn muốn cập nhật tổ chức sang ví này.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={linkWallet}
                      disabled={linking || hasPhantom === false}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
                    >
                      {linking ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
                      {linking ? "Đang xử lý..." : browserConnectedKey && browserConnectedKey !== selected.walletPublicKey ? "Liên kết ví Phantom đang mở" : "Xác minh lại / Đổi Phantom khác"}
                    </button>
                  </div>
                ) : (
                  /* State 2 & 3: Not verified */
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái ví</p>
                      <p className="mt-1 text-sm text-slate-300">
                        Chưa liên kết Phantom cho organization này.
                      </p>
                      {browserConnectedKey && (
                        <div className="mt-2 text-xs text-violet-300">
                          Ví đang mở trong Phantom: <span className="font-mono">{shortAddress(browserConnectedKey)}</span>
                        </div>
                      )}
                    </div>

                    {browserConnectedKey ? (
                      /* State 3: Connected in browser, ready to verify ownership */
                      <button
                        type="button"
                        onClick={linkWallet}
                        disabled={linking || hasPhantom === false}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white hover:bg-violet-400 disabled:opacity-60 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                      >
                        {linking ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                        {linking ? "Đang xác minh..." : "Xác minh ví"}
                      </button>
                    ) : (
                      /* State 2: Not connected yet */
                      <button
                        type="button"
                        onClick={connectPhantomBrowser}
                        disabled={linking || hasPhantom === false}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white hover:bg-violet-400 disabled:opacity-60 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                      >
                        {linking ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
                        {linking ? "Đang kết nối..." : "Connect Phantom"}
                      </button>
                    )}
                  </div>
                )}

                {/* Prominent Security Notice */}
                <div className="flex items-start gap-2.5 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-3.5 text-xs leading-relaxed text-cyan-100/90">
                  <Info className="mt-0.5 size-4 shrink-0 text-cyan-400" />
                  <div>
                    <p className="font-bold text-cyan-300">Cảnh báo an toàn:</p>
                    <p className="mt-0.5">
                      Signing this message does not send SOL and does not create a payment transaction.
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Chữ ký chỉ dùng để xác minh quyền sở hữu ví; không có thanh toán.
                    </p>
                  </div>
                </div>
              </>
            )}

            {message && (
              <p className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0" />
                {message}
              </p>
            )}
            {error && (
              <p className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
