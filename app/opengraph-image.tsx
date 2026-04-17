import { ImageResponse } from "next/og";

export const alt = "WHAT:TIME:IS:IT";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#000",
          color: "#fff",
          display: "flex",
          height: "100%",
          justifyContent: "flex-start",
          paddingTop: 72,
          width: "100%",
        }}
      >
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          WHAT:TIME:IS:IT
        </div>
      </div>
    ),
    size,
  );
}
