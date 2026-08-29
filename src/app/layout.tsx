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
  title: "Check-Di · Truy xuất nguồn gốc theo từng chặng",
  description:
    "Check-Di giúp theo dõi hành trình sản phẩm từ nơi sản xuất đến điểm bán bằng timeline, QR, AI đối chiếu chứng từ và hash kiểm tra tính toàn vẹn.",
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
