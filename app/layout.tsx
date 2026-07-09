import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "段取　命　君",
  description: "職長から始める、現場の記録アプリ。日報・領収書・写真メモを現場ごとにまとめて会社へ共有",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#0f67b1",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
