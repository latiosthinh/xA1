import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MMO Store - Game Items & Digital Goods",
  description: "Fast, minimal store with instant Telegram checkout and notifications",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
