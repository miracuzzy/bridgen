import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Nav, Footer } from "@/components/chrome";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const description = "Cross-chain swaps, powered by NEAR Intents. Set conditions with Swap Guard before you send.";

export const metadata: Metadata = {
  metadataBase: new URL("https://usebridgen.vercel.app"),
  title: { default: "Bridgen. Move assets with confidence.", template: "%s | Bridgen" },
  description,
  applicationName: "Bridgen",
  openGraph: { title: "Bridgen. Move assets with confidence.", description, siteName: "Bridgen", type: "website" },
  twitter: { card: "summary_large_image", site: "@usebridgen", creator: "@usebridgen", title: "Bridgen. Move assets with confidence.", description },
};

export const viewport: Viewport = { themeColor: "#0a0a0b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen antialiased`}>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
