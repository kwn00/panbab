import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "판밥 — 2판교 오늘의 점심",
  description:
    "오늘 점심, 뭐 먹을까요? 2판교 식당의 오전 메뉴판을 한눈에. 방문할 때 확인하고 5분 동안 캐싱해 빠르게 보여드려요.",
  applicationName: "판밥",
  appleWebApp: { capable: true, title: "판밥", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "판밥 — 오늘 점심, 뭐 먹을까요?",
    description: "2판교의 오늘 메뉴판, 한 곳에 모아뒀어요.",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cafeptthumb-phinf.pstatic.net" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
