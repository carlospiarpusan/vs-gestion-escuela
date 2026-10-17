import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="180" height="180" viewBox="0 0 64 64" fill="none">
        <path
          d="M45.8 17.8C39.6 11.7 28.1 11.2 20.3 17.5C12 24.2 9.7 36.1 15.2 45.1C18.5 50.5 24.2 54.2 30.7 55"
          stroke="#111111"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.8 55.2C24.5 41.3 35.4 32.4 51.8 30.4C43 36.9 36.1 45.6 31.8 57.5C27.2 57.2 22.5 56.3 17.8 55.2Z"
          fill="#111111"
        />
        <path
          d="M28.2 50.9C32.3 43.8 38.1 38.8 45.6 35.7"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </div>,
    {
      ...size,
    }
  );
}
