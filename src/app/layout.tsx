import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
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
  title: "Gestion restaurant",
  description: "Planning, stocks, finances et gestion complète pour établissements de restauration",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: { capable: true, title: "Gestion restaurant" },
};

export const viewport = {
  themeColor: "#1b3ae8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased light`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col bg-[#F5F6FA] text-[#1A1D23]">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
