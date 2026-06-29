import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import PWARegister from "@/app/_components/PWARegister";

export const metadata: Metadata = {
  title: "小宝修仙",
  description: "小宝修仙智能后台管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
      suppressHydrationWarning // 允许 Next/AntD 混合渲染的主题属性差异
    >
      <body className="min-h-full flex flex-col antialiased">
        <PWARegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
