import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "現場事務アシスト",
  description: "担当現場の記録を会社へ共有できる、現場責任者向けの記録アシスタント",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#0f67b1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
