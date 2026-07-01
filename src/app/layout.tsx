import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QMS-EDU - Hệ thống báo cáo và quản lý chất lượng giáo dục",
  description: "Giải pháp báo cáo chất lượng giảng dạy, kế hoạch bài dạy và điều chỉnh sau tiết dạy tích hợp Google Drive và kiểm duyệt thông minh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full bg-slate-950 text-slate-100 font-sans`}>
        {children}
      </body>
    </html>
  );
}
