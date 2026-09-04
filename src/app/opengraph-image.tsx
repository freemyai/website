import { ImageResponse } from "next/og";

export const alt = "Freemy AI — The AI you own.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0B0C0B",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          color: "#F4F2EC",
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "0.12em",
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            background: "#B7F34A",
            borderRadius: 3,
          }}
        />
        FREEMY AI
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: "#F4F2EC",
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          The AI you own.
        </div>
        <div
          style={{
            display: "flex",
            gap: 28,
            marginTop: 40,
            color: "#9B988E",
            fontSize: 30,
          }}
        >
          <span>Your memory.</span>
          <span>Your models.</span>
          <span>Your machine.</span>
          <span style={{ color: "#C7FF61" }}>Your rules.</span>
        </div>
      </div>

      <div style={{ color: "#716E66", fontSize: 22, letterSpacing: "0.06em" }}>
        freemy.ai
      </div>
    </div>,
    size,
  );
}
