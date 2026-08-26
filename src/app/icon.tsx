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
          background: "#14120e",
          border: "2px solid #d97706",
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            backgroundColor: "#d97706",
            border: "1px solid #f59e0b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#14120e",
            fontSize: 12,
            fontWeight: "900",
            fontFamily: "monospace",
          }}
        >
          xA1
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
