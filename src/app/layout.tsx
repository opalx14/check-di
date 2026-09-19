import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const fontDisplay = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://check-di.promptmarketcap.net"),
  title: "Check-Di · Quét QR, xem nguồn gốc, kiểm tra proof thật",
  description:
    "Check-Di theo dõi hành trình sản phẩm qua 5 chặng bằng QR, AI/Data Checks, SHA-256 + Ed25519, Solana Devnet và public audit dossier.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "Check-Di",
    title: "Check-Di · Quét QR, xem nguồn gốc, kiểm tra proof thật",
    description:
      "Live demo truy xuất nguồn gốc với chain 5/5, Solana Devnet 5/5, fresh-RPC verifier và redacted audit dossier.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Check-Di live production proof",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Check-Di · Quét QR, xem nguồn gốc, kiểm tra proof thật",
    description:
      "QR traceability + AI/Data Checks + Solana Devnet proof + public audit dossier.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} dark`}
    >
      <body className="min-h-screen bg-[#07090e] font-sans text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
