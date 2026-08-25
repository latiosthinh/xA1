import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0f18",
          border: "2px solid #10b981",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            backgroundColor: "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0d0f18",
            fontSize: 12,
            fontWeight: "bold",
            fontFamily: "monospace",
          }}
        >
          A
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
