import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        background: "#faf9f5", color: "#30493a", display: "flex",
        flexDirection: "column", justifyContent: "center", alignItems: "center",
        width: "100%", height: "100%", borderRadius: "110px",
      }}>
        <div style={{
          display: "flex", width: "270px", height: "270px",
          border: "4px solid #849880", borderRadius: "50%",
          justifyContent: "center", alignItems: "center",
          background: "radial-gradient(circle at 30% 25%, #f0f3e9, #c6d5bd 72%, #a1b49a)",
          boxShadow: "0 18px 36px #4d6b5126",
        }}>
          <div style={{ fontSize: "185px", lineHeight: 1, color: "#486b50" }}>✳</div>
        </div>
        <div style={{ display: "flex", fontSize: "43px", fontFamily: "Georgia", marginTop: "22px" }}>
          atlas.
        </div>
      </div>
    ),
    size,
  );
}
