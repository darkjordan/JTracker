import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MoneyPrivacyProvider } from "@/components/money-privacy";
import ServiceWorker from "./service-worker";
import { LanguageProvider } from "@/lib/i18n-client";
import { getLang, getServerT } from "@/lib/i18n-server";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const MEDIANET_CLIENT_ID = process.env.NEXT_PUBLIC_MEDIANET_CLIENT_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: "JTracker",
    description: t("app.metaDescription"),
    icons: { apple: "/apple-icon.png" },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "JTracker",
    },
    other: ADSENSE_CLIENT_ID
      ? { "google-adsense-account": ADSENSE_CLIENT_ID }
      : {},
  };
}

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  viewportFit: "cover", // lets the fixed bottom tab bar pad for the iOS home indicator
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLang();
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {ADSENSE_CLIENT_ID && (
          // A plain native <script> element, deliberately NOT next/script's
          // <Script> component: next/script (even strategy="beforeInteractive")
          // only emits a <link rel="preload"> in the server-rendered HTML and
          // injects the real <script> tag client-side after hydration — which
          // Google's AdSense crawler (raw HTML fetch, no JS execution) never
          // sees. A bare <script> tag renders literally, matching exactly what
          // AdSense's verification snippet expects.
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
        {MEDIANET_CLIENT_ID && (
          // Same reasoning as the AdSense script above: a plain native tag,
          // not next/script, so Media.net's site-verification crawler sees
          // it in the raw server-rendered HTML. NOTE: this is Media.net's
          // standard documented loader pattern, not yet verified against a
          // live account (the user doesn't have one yet) — the exact script
          // may need adjusting once real Media.net-generated code exists,
          // the same way the AdSense integration needed a fix after testing
          // against Google's actual crawler.
          <script
            async
            src={`https://contextual.media.net/dmedianet.js?cid=${MEDIANET_CLIENT_ID}`}
          />
        )}
        <LanguageProvider lang={lang}>
          <ServiceWorker />
          <MoneyPrivacyProvider>{children}</MoneyPrivacyProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
