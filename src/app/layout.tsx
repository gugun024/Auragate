import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "AuraGate - Smart AI Gateway & API Key Rotator",
    template: "%s | AuraGate",
  },
  description:
    "Self-hosted AI Gateway & Smart API Key Rotator for OpenCode, Cursor, and LLMs. Featuring automatic provider auto-detection, live model importer, round-robin key pool, failover cooldown, RTK token saver, and multi-client gateway token management.",
  keywords: [
    "AuraGate",
    "AI Gateway",
    "API Key Rotator",
    "OpenCode Proxy",
    "Cursor IDE Proxy",
    "OpenAI Router",
    "Groq Router",
    "Mistral AI Gateway",
    "DeepSeek Proxy",
    "LLM Router",
    "Multi-Client Gateway Tokens",
  ],
  authors: [{ name: "AuraGate Team" }],
  creator: "AuraGate",
  publisher: "AuraGate",
  icons: {
    icon: "/auragate_logo.jpg",
    shortcut: "/auragate_logo.jpg",
    apple: "/auragate_logo.jpg",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "http://localhost:20128",
    title: "AuraGate - Smart AI Gateway & API Key Rotator",
    description:
      "Self-hosted AI Gateway & Smart API Key Rotator for OpenCode, Cursor, and LLMs.",
    siteName: "AuraGate AI Gateway",
    images: [
      {
        url: "http://localhost:20128/auragate_logo.jpg",
        width: 800,
        height: 800,
        alt: "AuraGate AI Gateway Brand Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AuraGate - Smart AI Gateway & API Key Rotator",
    description:
      "Self-hosted AI Gateway & Smart API Key Rotator for OpenCode, Cursor, and LLMs.",
    images: ["http://localhost:20128/auragate_logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
