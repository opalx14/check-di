import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
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
    <html lang="vi" className={`${fontSans.variable} ${fontMono.variable} dark`}>
      <body className="min-h-screen bg-[#07090e] font-sans text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
