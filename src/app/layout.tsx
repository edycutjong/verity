import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Verity — RWA oracles that bleed when they're wrong",
  description:
    "An autonomous RWA oracle agent that reasons over conflicting evidence, whose on-chain reputation rises and falls with its accuracy, and whose data you pay for per query via Casper x402. Part of the Vouch suite.",
  icons: {
    icon: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "Verity — RWA oracles that bleed when they're wrong",
    description: "An autonomous RWA oracle agent that reasons over conflicting evidence, whose on-chain reputation rises and falls with its accuracy, and whose data you pay for per query via Casper x402.",
    url: "https://verity.edycu.dev",
    siteName: "Verity",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Verity",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verity — RWA oracles that bleed when they're wrong",
    description: "An autonomous RWA oracle agent that reasons over conflicting evidence, whose on-chain reputation rises and falls with its accuracy, and whose data you pay for per query via Casper x402.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
