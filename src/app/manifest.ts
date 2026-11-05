import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bridgen",
    short_name: "Bridgen",
    description: "Cross-chain swaps, powered by NEAR Intents.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/brand/icon-16.png", sizes: "16x16", type: "image/png" },
      { src: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
