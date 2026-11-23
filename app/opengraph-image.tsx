import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "kn1ghts — competitive cybersecurity and CTF team from India";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Light broadsheet card, matching the redesigned site exactly:
// paper background, ink masthead rule, one red flag mark.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F7F3EA",
          color: "#161513",
          padding: "72px 84px",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            borderBottom: "4px solid #161513",
            paddingBottom: "24px",
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1 }}>
            kn<span style={{ color: "#B3261E" }}>1</span>ghts
          </div>
          <div style={{ fontSize: 22, letterSpacing: "4px", color: "#6B6659" }}>
            INDIA — 2026 SEASON
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 0.98, letterSpacing: "-3px" }}>
            Four first places
          </div>
          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 0.98, letterSpacing: "-3px" }}>
            in <span style={{ fontStyle: "italic", fontWeight: 600 }}>2026.</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(22,21,19,0.42)",
            paddingTop: "20px",
            fontSize: 24,
            letterSpacing: "2px",
            color: "#6B6659",
          }}
        >
          <span>CTFTIME 457 · 175.732 PTS</span>
          <span>
            <span style={{ color: "#B3261E" }}>1ST</span> CRUXIPHER · EXPLOITX · AAZHI · BLACKBOX
          </span>
        </div>
      </div>
    ),
    size,
  );
}
