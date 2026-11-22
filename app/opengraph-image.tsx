import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "kn1ghts, the cybersecurity and CTF team, with a playful knight illustration";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(130deg, #fff9f5 0%, #f6edf9 52%, #f0ebff 100%)",
      fontFamily: "Arial, sans-serif", color: "#443550",
    }}>
      <div style={{ display: "flex", fontSize: 152, fontWeight: 800, letterSpacing: -11, lineHeight: 1.1 }}>
        <span>kn</span><span style={{ color: "#ffb72f" }}>1</span><span>ghts</span>
      </div>
      <div style={{ width: 340, height: 260, display: "flex", position: "relative", marginTop: 5 }}>
        <div style={{
          position: "absolute", width: 110, height: 63, background: "#e9545a",
          border: "8px solid #bd4657", borderRadius: 85, top: 5, left: 107, transform: "rotate(-23deg)",
        }} />
        <div style={{
          position: "absolute", width: 222, height: 222, background: "#dcd6e6",
          border: "10px solid #786777", borderRadius: 115, top: 21, left: 59,
        }} />
        <div style={{
          position: "absolute", width: 179, height: 140, background: "#fff3e8",
          border: "6px solid #a8888c", borderRadius: 100, top: 92, left: 82,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 18, height: 23, background: "#4b333e", borderRadius: 20, marginRight: 46 }} />
          <div style={{ width: 18, height: 23, background: "#4b333e", borderRadius: 20 }} />
        </div>
        <div style={{
          position: "absolute", width: 274, height: 88, top: 168, left: 34,
          background: "repeating-linear-gradient(115deg, #ffc842 0px, #ffc842 50px, #544452 50px, #544452 95px)",
          border: "11px solid #e9a43e", borderRadius: 20,
        }} />
      </div>
    </div>,
    { ...size },
  );
}
