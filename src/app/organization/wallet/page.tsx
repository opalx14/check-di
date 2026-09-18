"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TourGuide, type TourStep } from "@/components/TourGuide";
import type { CheckDiOrganizationMembership } from "@/lib/auth/server";
import { CHECK_DI_REGISTRY_PROGRAM_ID } from "@/lib/solana/config";
import {
  createBrowserDevnetWallet,
  deleteBrowserDevnetWallet,
  getBrowserDevnetWalletMetadata,
  getUnlockedBrowserDevnetWallet,
  unlockBrowserDevnetWallet,
  type BrowserDevnetWalletMetadata,
} from "@/lib/wallet/browser-devnet-wallet";
import {
  connectPhantomSigner,
  hasPhantomProvider,
  type CheckDiClientWalletSigner,
} from "@/lib/wallet/client-signer";

const WALLET_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="wallet-network-info"]',
    title: "Ví tổ chức trên Solana Devnet",
    description:
      "Check-Di dùng custom Anchor registry trên Devnet để ghi integrity/status proof. Ví tổ chức chỉ ký dữ liệu và transaction của chặng.",
  },
  {
    target: '[data-tour="wallet-org-select"]',
    title: "Chọn tổ chức",
    description:
      "Tài khoản owner có thể thiết lập signer riêng cho từng tổ chức mà mình quản lý.",
  },
  {
    target: '[data-tour="wallet-methods"]',
    title: "Chọn cách ký",
    description:
      "Bạn có thể dùng Phantom hiện có hoặc tạo ví thử nghiệm Devnet ngay trong Check-Di. Ví thử nghiệm được mã hóa cục bộ và không gửi secret key lên server.",
  },
  {
    target: '[data-tour="wallet-security-notice"]',
    title: "Devnet only",
    description:
      "Ví thử nghiệm chỉ dành cho hackathon/testing trên Solana Devnet. Không dùng ví này để nhận hoặc giữ tài sản mainnet.",
    actionLabel: "Tiếp tục tạo sản phẩm mới →",
    actionHref: "/batches/new?tour=1",
  },
];

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
  const [hackathonAutoConfirmed, setHackathonAutoConfirmed] = useState(false);
  const [memberships, setMemberships] = useState<CheckDiOrganizationMembership[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasPhantom, setHasPhantom] = useState(false);
  const [phantomKey, setPhantomKey] = useState<string | null>(null);
  const [localMetadata, setLocalMetadata] =
    useState<BrowserDevnetWalletMetadata | null>(null);
  const [localUnlocked, setLocalUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseConfirm, setPassphraseConfirm] = useState("");

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
        setError("Bạn cần đăng nhập tài khoản owner trước khi thiết lập ví tổ chức.");
        setMemberships([]);
        return;
      }
      const nextMemberships = payload.memberships ?? [];
      setMemberships(nextMemberships);
      const firstOwner = nextMemberships.find(
        (membership) => membership.role === "owner",
      );
      setOrganizationId((current) => current || firstOwner?.organizationId || "");
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshLocalWallet(nextOrganizationId = organizationId) {
    if (!nextOrganizationId) {
      setLocalMetadata(null);
      setLocalUnlocked(false);
      return;
    }
    const metadata = await getBrowserDevnetWalletMetadata(
      nextOrganizationId,
    ).catch(() => null);
    setLocalMetadata(metadata);
    setLocalUnlocked(Boolean(getUnlockedBrowserDevnetWallet(nextOrganizationId)));
  }

  useEffect(() => {
    void loadMemberships();
    setHasPhantom(hasPhantomProvider());
    setHackathonAutoConfirmed(
      new URLSearchParams(window.location.search).get("signup") ===
        "hackathon-auto-confirmed",
    );
  }, []);

  useEffect(() => {
    void refreshLocalWallet(organizationId);
  }, [organizationId]);

  async function verifyAndLinkSigner(signer: CheckDiClientWalletSigner) {
    if (!organizationId) throw new Error("organization_required");

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

    const signature = await signer.signMessage(
      new TextEncoder().encode(challenge.message),
    );
    const verifyResponse = await fetch("/api/auth/wallet/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        organizationId,
        publicKey: signer.publicKey,
        signatureBase64: bytesToBase64(signature),
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

    await loadMemberships();
    return signer.publicKey;
  }

  async function connectAndLinkPhantom() {
    setLinking(true);
    setError(null);
    setMessage(null);
    try {
      const signer = await connectPhantomSigner();
      setPhantomKey(signer.publicKey);
      const publicKey = await verifyAndLinkSigner(signer);
      setMessage(`Phantom ${shortAddress(publicKey)} đã được xác minh và liên kết với tổ chức.`);
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "unknown_error";
      setError(
        code === "phantom_not_available"
          ? "Không tìm thấy Phantom trên trình duyệt này. Bạn có thể tạo ví thử nghiệm Devnet ngay bên dưới."
          : "Không thể xác minh Phantom. Hãy kiểm tra đúng tài khoản ví và ký lại challenge.",
      );
    } finally {
      setLinking(false);
    }
  }

  async function createAndLinkLocalWallet() {
    if (!organizationId) return;
    if (passphrase.length < 8) {
      setError("Mật khẩu ví thử nghiệm cần ít nhất 8 ký tự.");
      return;
    }
    if (passphrase !== passphraseConfirm) {
      setError("Mật khẩu ví nhập lại chưa khớp.");
      return;
    }

    setLocalBusy(true);
    setError(null);
    setMessage(null);
    try {
      const signer = await createBrowserDevnetWallet(
        organizationId,
        passphrase,
      );
      const publicKey = await verifyAndLinkSigner(signer);
      setPassphrase("");
      setPassphraseConfirm("");
      await refreshLocalWallet();
      setMessage(
        `Đã tạo và liên kết ví thử nghiệm Devnet ${shortAddress(publicKey)}. Secret key được mã hóa cục bộ trong trình duyệt này.`,
      );
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "unknown_error";
      setError(
        code === "browser_wallet_storage_unavailable"
          ? "Trình duyệt này không hỗ trợ bộ nhớ cần thiết để tạo ví thử nghiệm."
          : "Không thể tạo hoặc xác minh ví thử nghiệm. Hãy thử lại.",
      );
    } finally {
      setLocalBusy(false);
    }
  }

  async function unlockLocalWallet() {
    if (!organizationId) return;
    setLocalBusy(true);
    setError(null);
    setMessage(null);
    try {
      const signer = await unlockBrowserDevnetWallet(
        organizationId,
        passphrase,
      );
      setPassphrase("");
      setLocalUnlocked(true);
      if (selected?.walletPublicKey === signer.publicKey) {
        setMessage("Ví thử nghiệm đã mở khóa cho phiên trình duyệt này và sẵn sàng ký.");
      } else {
        const publicKey = await verifyAndLinkSigner(signer);
        setMessage(
          `Ví thử nghiệm ${shortAddress(publicKey)} đã mở khóa và được liên kết lại với tổ chức.`,
        );
      }
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "unknown_error";
      setError(
        code === "browser_wallet_unlock_failed"
          ? "Không thể mở khóa ví. Kiểm tra lại mật khẩu ví thử nghiệm."
          : "Không thể mở khóa ví thử nghiệm.",
      );
    } finally {
      setLocalBusy(false);
    }
  }

  async function removeLocalWallet() {
    if (!organizationId || !localMetadata) return;
    const warning =
      selected?.walletPublicKey === localMetadata.publicKey
        ? "Ví này đang là signer của tổ chức. Xóa khỏi trình duyệt sẽ không xóa public key khỏi Check-Di; bạn cần liên kết Phantom hoặc tạo ví mới trước khi ký tiếp. Vẫn xóa?"
        : "Xóa ví thử nghiệm được mã hóa khỏi trình duyệt này?";
    if (!window.confirm(warning)) return;

    setLocalBusy(true);
    try {
      await deleteBrowserDevnetWallet(organizationId);
      setLocalMetadata(null);
      setLocalUnlocked(false);
      setMessage("Đã xóa ví thử nghiệm khỏi trình duyệt này.");
    } finally {
      setLocalBusy(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is optional.
    }
  }

  const localMatchesLinked =
    Boolean(localMetadata) &&
    localMetadata?.publicKey === selected?.walletPublicKey;

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/supplier"
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            ← Kho sản phẩm
          </Link>
          <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-violet-300">
            SOLANA DEVNET
          </span>
        </div>

        {hackathonAutoConfirmed && (
          <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm text-amber-100">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-300" />
              <div>
                <p className="font-bold">Hackathon test mode</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/75">
                  Supabase email delivery đang bị rate-limit nên tài khoản test này được server tạo ở trạng thái đã xác nhận theo feature flag dành riêng cho hackathon. Đây không phải luồng xác minh quyền sở hữu email dùng cho production thông thường.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]/95 shadow-2xl">
          <div className="border-b border-white/10 p-5 sm:p-7">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
              <Wallet className="size-5" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-white">
              Thiết lập ví ký cho tổ chức
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Dùng Phantom của bạn hoặc tạo một ví thử nghiệm ngay trên Check-Di.
              Cả hai đều ký Ed25519 như organization signer; server fee-payer tiếp
              tục trả phí giao dịch Devnet.
            </p>

            <div
              className="mt-4 flex flex-wrap items-center gap-2 pt-1 text-[11px]"
              data-tour="wallet-network-info"
            >
              <div className="rounded-lg border border-white/5 bg-slate-950/60 px-2.5 py-1 text-slate-400">
                Network:{" "}
                <span className="font-semibold text-emerald-300">
                  Solana Devnet
                </span>
              </div>
              <a
                href={`https://explorer.solana.com/address/${encodeURIComponent(CHECK_DI_REGISTRY_PROGRAM_ID)}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-slate-950/60 px-2.5 py-1 text-slate-400 transition hover:border-cyan-500/30 hover:text-cyan-200"
              >
                Program:{" "}
                <span className="font-mono text-cyan-300">
                  {shortAddress(CHECK_DI_REGISTRY_PROGRAM_ID)}
                </span>
                <ArrowUpRight className="size-3" />
              </a>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin text-violet-400" />
                Đang đọc thông tin organization...
              </div>
            ) : ownerMemberships.length === 0 ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-100/80">
                Cần tài khoản có role <strong>owner</strong>.{" "}
                <Link className="underline hover:text-white" href="/signup">
                  Tạo tài khoản và tổ chức
                </Link>
              </div>
            ) : (
              <>
                <label
                  className="block text-xs font-semibold text-slate-300"
                  data-tour="wallet-org-select"
                >
                  Organization
                  <select
                    value={organizationId}
                    onChange={(event) => {
                      setOrganizationId(event.target.value);
                      setMessage(null);
                      setError(null);
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50"
                  >
                    {ownerMemberships.map((membership) => (
                      <option
                        key={membership.organizationId}
                        value={membership.organizationId}
                      >
                        {membership.organizationName} ({membership.role})
                      </option>
                    ))}
                  </select>
                </label>

                {selected?.walletPublicKey && (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                        <CheckCircle2 className="size-4" />
                        Organization signer linked
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                        {shortAddress(selected.walletPublicKey)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/70 p-3">
                      <p className="min-w-0 flex-1 break-all font-mono text-xs text-slate-200">
                        {selected.walletPublicKey}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(selected.walletPublicKey!)
                        }
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        {copied ? (
                          <Check className="size-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <a
                        href={`https://explorer.solana.com/address/${encodeURIComponent(selected.walletPublicKey)}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
                      >
                        View on Solana Explorer
                        <ExternalLink className="size-3" />
                      </a>
                      {localMatchesLinked && (
                        <span className="text-[11px] text-cyan-300">
                          {localUnlocked
                            ? "Ví thử nghiệm đang mở khóa"
                            : "Ví thử nghiệm đang khóa"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div
                  className="grid gap-4 md:grid-cols-2"
                  data-tour="wallet-methods"
                >
                  <section className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="size-4 text-violet-300" />
                      <h2 className="text-sm font-bold text-white">
                        Dùng Phantom
                      </h2>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Phù hợp khi bạn đã có Phantom và muốn dùng chính ví đó để
                      ký challenge, event hash và Registry transaction.
                    </p>
                    {phantomKey && (
                      <p className="mt-2 font-mono text-[11px] text-violet-300">
                        Browser: {shortAddress(phantomKey)}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={connectAndLinkPhantom}
                      disabled={linking || !hasPhantom}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {linking ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-4" />
                      )}
                      {linking
                        ? "Đang xác minh..."
                        : hasPhantom
                          ? "Kết nối & xác minh Phantom"
                          : "Chưa phát hiện Phantom"}
                    </button>
                    {!hasPhantom && (
                      <a
                        href="https://phantom.app/"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"
                      >
                        Cài Phantom
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </section>

                  <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-4">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-4 text-cyan-300" />
                      <h2 className="text-sm font-bold text-white">
                        Ví thử nghiệm Check-Di
                      </h2>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Tạo Ed25519 keypair ngay trên trình duyệt. Secret key được
                      mã hóa AES-GCM bằng mật khẩu ví riêng và lưu trong IndexedDB.
                    </p>

                    {localMetadata ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          Ví đã lưu trên trình duyệt này
                        </p>
                        <p className="mt-1 font-mono text-xs text-cyan-200">
                          {shortAddress(localMetadata.publicKey)}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-2">
                      <input
                        type="password"
                        value={passphrase}
                        onChange={(event) => setPassphrase(event.target.value)}
                        autoComplete="new-password"
                        placeholder={
                          localMetadata
                            ? "Mật khẩu ví để mở khóa"
                            : "Đặt mật khẩu ví (≥ 8 ký tự)"
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                      />
                      {!localMetadata && (
                        <input
                          type="password"
                          value={passphraseConfirm}
                          onChange={(event) =>
                            setPassphraseConfirm(event.target.value)
                          }
                          autoComplete="new-password"
                          placeholder="Nhập lại mật khẩu ví"
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50"
                        />
                      )}
                    </div>

                    {localMetadata ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={unlockLocalWallet}
                          disabled={localBusy || !passphrase}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                        >
                          {localBusy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <KeyRound className="size-4" />
                          )}
                          Mở khóa
                        </button>
                        <button
                          type="button"
                          onClick={removeLocalWallet}
                          disabled={localBusy}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" />
                          Xóa khỏi trình duyệt
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={createAndLinkLocalWallet}
                        disabled={
                          localBusy || !passphrase || !passphraseConfirm
                        }
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                      >
                        {localBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <KeyRound className="size-4" />
                        )}
                        Tạo & liên kết ví Devnet
                      </button>
                    )}
                  </section>
                </div>

                <div
                  className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-3.5 text-xs leading-relaxed text-amber-100/90"
                  data-tour="wallet-security-notice"
                >
                  <Info className="mt-0.5 size-4 shrink-0 text-amber-300" />
                  <div>
                    <p className="font-bold text-amber-200">
                      Ví thử nghiệm chỉ dành cho Solana Devnet
                    </p>
                    <p className="mt-1 text-amber-100/75">
                      Không dùng ví này để nhận hoặc giữ tài sản mainnet. Secret
                      key không được gửi lên server, nhưng đây chưa phải sản phẩm
                      ví đã qua security audit. Quên mật khẩu ví thì không thể
                      khôi phục secret key đã mã hóa.
                    </p>
                  </div>
                </div>

                {selected?.walletPublicKey && (
                  <Link
                    href="/batches/new?tour=1"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Tiếp tục tạo sản phẩm đầu tiên →
                  </Link>
                )}
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

      <TourGuide
        tourKey="supplier_wallet_v2"
        flowTitle="Hướng dẫn thiết lập ví"
        role="supplier"
        steps={WALLET_TOUR_STEPS}
      />
    </main>
  );
}
