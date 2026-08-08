import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MoneyPrivacyProvider } from "@/components/money-privacy";
import ServiceWorker from "./service-worker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JTracker",
  description: "Personal money tracker — income, expenses, and tax relief.",
  icons: { apple: "/apple-icon.png" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JTracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  viewportFit: "cover", // lets the fixed bottom tab bar pad for the iOS home indicator
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorker />
        <MoneyPrivacyProvider>{children}</MoneyPrivacyProvider>
      </body>
    </html>
  );
}
