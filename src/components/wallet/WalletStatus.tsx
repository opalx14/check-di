"use client";

import { Check, Copy, ExternalLink, Loader2, Settings, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type OrganizationMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  walletPublicKey?: string;
  role: string;
};

type MePayload = {
  ok: boolean;
  memberships?: OrganizationMembership[];
};

function shortAddress(address?: string) {
  if (!address) return "—";
  if (address.length <= 11) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletStatus({ mobile = false }: { mobile?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"anonymous" | "no_wallet" | "connected">("anonymous");
  const [activeMembership, setActiveMembership] = useState<OrganizationMembership | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function checkAuthAndWallet() {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setStatus("anonymous");
        setActiveMembership(null);
        return;
      }
      const data = (await response.json()) as MePayload;
      if (!data.ok || !data.memberships || data.memberships.length === 0) {
        setStatus("anonymous");
        setActiveMembership(null);
        return;
      }

      // Find first membership with wallet, or first owner, or first membership
      const linked = data.memberships.find((m) => Boolean(m.walletPublicKey));
      const first = linked ?? data.memberships[0];

      setActiveMembership(first);
      if (first?.walletPublicKey) {
        setStatus("connected");
      } else {
        setStatus("no_wallet");
      }
    } catch {
      setStatus("anonymous");
      setActiveMembership(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    void checkAuthAndWallet();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  async function handleCopy() {
    if (!activeMembership?.walletPublicKey) return;
    try {
      await navigator.clipboard.writeText(activeMembership.walletPublicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
    }
  }

  if (!mounted) {
    return (
      <div
        className={
          mobile
            ? "size-9 rounded-xl border border-white/5 bg-white/5"
            : "h-9 w-28 rounded-xl border border-white/5 bg-white/5"
        }
      />
    );
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 ${
          mobile ? "size-9" : "h-9 px-3 text-xs"
        }`}
      >
        <Loader2 className="size-3.5 animate-spin" />
      </div>
    );
  }

  // Mobile View
  if (mobile) {
    if (status === "connected") {
      return (
        <a
          href="/organization/wallet"
          aria-label="Organization wallet status"
          className="relative flex size-9 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300 transition hover:bg-violet-500/20"
        >
          <Wallet className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        </a>
      );
    }

    if (status === "no_wallet") {
      return (
        <a
          href="/organization/wallet"
          aria-label="Connect Phantom wallet"
          className="relative flex size-9 items-center justify-center rounded-xl border border-violet-500/20 bg-white/5 text-slate-300 hover:text-white"
        >
          <Wallet className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-amber-400" />
        </a>
      );
    }

    return (
      <a
        href="/login?next=/organization/wallet"
        aria-label="Connect wallet"
        className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white"
      >
        <Wallet className="size-4" />
      </a>
    );
  }

  // Desktop View: Anonymous
  if (status === "anonymous") {
    return (
      <a
        href="/login?next=/organization/wallet"
        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2 font-display text-xs font-semibold text-violet-200 transition hover:border-violet-500/40 hover:bg-violet-500/15"
      >
        <Wallet className="size-3.5 text-violet-300" />
        Ví nhà cung cấp
      </a>
    );
  }

  // Desktop View: Authenticated but not linked
  if (status === "no_wallet") {
    return (
      <a
        href="/organization/wallet"
        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/15 px-3 py-2 font-display text-xs font-bold text-violet-200 transition hover:bg-violet-500/25 hover:shadow-[0_0_12px_rgba(139,92,246,0.25)]"
      >
        <Wallet className="size-3.5 text-violet-300" />
        Kết nối Phantom
      </a>
    );
  }

  // Desktop View: Connected & Verified
  const walletKey = activeMembership?.walletPublicKey ?? "";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-xl border border-violet-500/25 bg-[#0b111c]/90 px-3 py-1.5 font-mono text-xs text-slate-200 transition hover:border-violet-400/40 hover:bg-[#0f172a]"
      >
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-[11px] font-semibold text-violet-300">Solana Devnet</span>
        </div>
        <span className="text-slate-500">·</span>
        <span className="text-slate-300">{shortAddress(walletKey)}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border border-white/10 bg-[#0b111c] p-4 text-xs shadow-2xl backdrop-blur-2xl">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="truncate font-display font-bold text-white">
                {activeMembership?.organizationName || "Organization"}
              </p>
              <p className="text-[11px] text-slate-400 capitalize">
                {activeMembership?.role || "member"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Đã kết nối
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/5 bg-slate-950/70 p-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Solana Devnet</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-violet-300 hover:text-violet-200"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-200 break-all">
              {walletKey}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400/90">
            <ShieldCheck className="size-3.5 shrink-0" />
            <span>Ed25519 Organization Verified</span>
          </div>

          <div className="mt-3 space-y-1 border-t border-white/5 pt-2">
            <a
              href={`https://explorer.solana.com/address/${encodeURIComponent(walletKey)}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <span>Mở Solana Explorer</span>
              <ExternalLink className="size-3 text-slate-500" />
            </a>
            <a
              href="/organization/wallet"
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <span>Quản lý ví</span>
              <Settings className="size-3 text-slate-500" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
