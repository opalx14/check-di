import { ImageResponse } from "next/og";

export const alt =
  "Check-Di — truy xuất nguồn gốc với QR, AI data checks và Solana Devnet proof";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#07090e",
          color: "#f8fafc",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 72% 20%, rgba(16,185,129,0.24), transparent 35%), radial-gradient(circle at 18% 80%, rgba(6,182,212,0.20), transparent 38%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 30,
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: 34,
            display: "flex",
          }}
        />

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            padding: "74px 82px",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  border: "1px solid rgba(34,211,238,0.4)",
                  background: "rgba(8,47,73,0.65)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#67e8f9",
                  fontSize: 28,
                  fontWeight: 800,
                }}
              >
                C
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 30, fontWeight: 800 }}>Check-Di</div>
                <div style={{ fontSize: 15, color: "#94a3b8" }}>
                  Trace product journey
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                border: "1px solid rgba(52,211,153,0.34)",
                background: "rgba(16,185,129,0.10)",
                color: "#6ee7b7",
                borderRadius: 999,
                padding: "10px 18px",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              LIVE PRODUCTION PROOF
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 870 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontSize: 68,
                lineHeight: 1.02,
                letterSpacing: "-3px",
                fontWeight: 900,
              }}
            >
              Quét QR. Xem nguồn gốc.
              <span style={{ color: "#2dd4bf" }}> Kiểm tra proof thật.</span>
            </div>
            <div
              style={{
                marginTop: 24,
                maxWidth: 820,
                fontSize: 25,
                lineHeight: 1.45,
                color: "#cbd5e1",
              }}
            >
              5 chặng truy xuất · AI/Data Checks · SHA-256 + Ed25519 · Solana
              Devnet · Audit dossier
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 14,
            }}
          >
            {[
              ["CHAIN", "5/5 VALID"],
              ["DEVNET", "5/5 VERIFIED"],
              ["VERIFIER", "FRESH RPC"],
              ["AUDIT", "REDACTED"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                  border: "1px solid rgba(148,163,184,0.16)",
                  background: "rgba(15,23,42,0.7)",
                  borderRadius: 17,
                  padding: "14px 17px",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    letterSpacing: "1.5px",
                    fontWeight: 700,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: "#a7f3d0",
                    fontWeight: 800,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
