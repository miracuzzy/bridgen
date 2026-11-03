import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav, Footer } from "@/components/chrome";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bridgen. Move assets with confidence.",
  description: "Cross-chain swaps, powered by NEAR Intents. Set conditions with Swap Guard before you send.",
};

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
