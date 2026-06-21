import { ImageResponse } from "next/og";

// Apple touch icon (home screen / bookmarks on iOS). Full-bleed
// gradient square with no transparency and no baked-in corner
// rounding — iOS applies its own mask shape on top, so a
// transparent or already-rounded source produces a halo/double
// border on the home screen. Self-contained for the same Satori
// constraint as icon.tsx/opengraph-image.tsx.

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2f5fff 0%, #8b5cf6 100%)",
        }}
      >
        <svg
          width="100"
          height="100"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7 L7.5 17 L12 9 L16.5 17 L21 7" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
