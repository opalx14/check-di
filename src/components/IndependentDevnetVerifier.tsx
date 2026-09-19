"use client";

import { useState } from "react";
import { RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";

import { useI18n } from "@/lib/i18n";

type IndependentEventResult = {
  eventId: string;
  stage: string;
  eventHash?: string;
  valid: boolean;
  kind?: "check-di-registry" | "spl-memo";
  registryAddress?: string;
  eventPda?: string;
  organizationPublicKey?: string;
  checks?: Record<string, boolean>;
  registryStatus?: string;
  eventStatus?: string;
  error?: string;
};

type IndependentVerifierResponse = {
  ok: boolean;
  verifier?: {
    mode: "fresh-devnet-rpc";
    network: "devnet";
    persistedMirrorTrusted: false;
    verifiedAt: string;
  };
  batch?: {
    publicId: string;
    eventCount: number;
  };
  summary?: {
    verifiedEvents: number;
    registryEvents: number;
    allRegistryEventsVerified: boolean;
  };
  events?: IndependentEventResult[];
  error?: string;
};

function short(value?: string, left = 8, right = 6) {
  if (!value) return "—";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

export function IndependentDevnetVerifier({
  publicId,
}: {
  publicId: string;
}) {
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IndependentVerifierResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verifyNow() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/verify/${encodeURIComponent(publicId)}/devnet`,
        {
          cache: "no-store",
          headers: { accept: "application/json" },
        },
      );
      const payload = (await response.json()) as IndependentVerifierResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "independent_verifier_failed");
      }
      setResult(payload);
    } catch (cause) {
      setResult(null);
      setError(
        cause instanceof Error ? cause.message : "independent_verifier_failed",
      );
    } finally {
      setLoading(false);
    }
  }

  const allVerified = result?.summary?.allRegistryEventsVerified === true;

  return (
    <section className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.035] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-300">
            {t("consumerVerify.independentTitle")}
          </p>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-400">
            {t("consumerVerify.independentDescription")}
          </p>
        </div>
        <button
          type="button"
          onClick={verifyNow}
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? t("consumerVerify.independentLoading") : t("consumerVerify.independentAction")}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-[11px] text-amber-200">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{t("consumerVerify.independentFailed", { error })}</span>
        </div>
      )}

      {result?.summary && result.verifier && (
        <div className="mt-3">
          <div
            className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
              allVerified
                ? "border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-300"
                : "border-amber-500/20 bg-amber-500/[0.05] text-amber-200"
            }`}
          >
            {allVerified ? (
              <ShieldCheck className="size-4 shrink-0" />
            ) : (
              <ShieldAlert className="size-4 shrink-0" />
            )}
            <span>
              {t("consumerVerify.independentSummary", {
                verified: result.summary.verifiedEvents,
                total: result.summary.registryEvents,
              })}
            </span>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(result.events ?? []).map((event) => (
              <div
                key={event.eventId}
                className="rounded-xl border border-white/8 bg-slate-950/45 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {event.stage}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      event.valid ? "text-emerald-300" : "text-amber-300"
                    }`}
                  >
                    {event.valid ? t("consumerVerify.verified").toUpperCase() : t("consumerVerify.notVerified").toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[9px] text-slate-500">
                  {t("consumerVerify.eventPda")} {short(event.eventPda)}
                </p>
                {event.error && (
                  <p className="mt-1 text-[9px] text-amber-300/80">
                    {event.error}
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="mt-2 text-[9px] leading-relaxed text-slate-600">
            {t("consumerVerify.freshRpcNote", {
              time: new Date(result.verifier.verifiedAt).toLocaleString(
                locale === "en" ? "en-US" : "vi-VN",
              ),
            })}
          </p>
        </div>
      )}
    </section>
  );
}
