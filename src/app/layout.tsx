import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "재고관리 시스템",
  description: "재고 현황 조회 및 입출고 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full antialiased ${inter.className} ${inter.variable}`}>
      <body className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[color:var(--surface)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[color:var(--foreground)] focus:shadow-[var(--elevation-3)]"
        >
          본문으로 건너뛰기
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
