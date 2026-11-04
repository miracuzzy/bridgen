import { ImageResponse } from "next/og";

export const alt = "Bridgen. Move assets with confidence.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0a0a0b", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 600 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#f97316" }} />
          Bridgen
        </div>
        <div style={{ marginTop: 48, fontSize: 84, fontWeight: 700, lineHeight: 1.05, display: "flex", flexDirection: "column" }}>
          <span>Move assets</span>
          <span style={{ color: "#f97316" }}>with confidence.</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 32, color: "rgba(255,255,255,0.6)" }}>Cross-chain swaps, powered by NEAR Intents.</div>
      </div>
    ),
    size,
  );
}
