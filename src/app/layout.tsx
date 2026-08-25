import type { Metadata } from "next";
import { Press_Start_2P, Space_Grotesk } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "xA1store - 8-Bit Pixel Digital Goods",
  description: "Retro pixel aesthetic store with Telegram bot bridge and instant delivery",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-[#0d0f18] text-slate-100 antialiased font-sans selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
