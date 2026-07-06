import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "親方の味方",
  description: "現場が終わったら5分で事務が終わる、効率重視のAI事務アシスタント",
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
