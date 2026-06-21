import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with the WAVON brand mark — a
// blue-to-violet gradient rounded square with a white wave-"W" glyph,
// matching `src/components/brand/wavon-mark.tsx` (sidebar/login/
// marketing nav). Kept self-contained (no shared component import)
// because this renders through Satori at build time, which only
// supports a subset of CSS/SVG — duplicating the small markup here
// avoids coupling the edge-rendered icon to a component meant for
// normal DOM rendering. Next.js auto-injects <link rel="icon">.
//
// This route takes precedence over src/app/favicon.ico, which is the
// Next.js default and can stay on disk harmlessly (or be removed).

export const runtime = "edge";
export const size = { width: 32, height: 32 };
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
          background: "linear-gradient(135deg, #2f5fff 0%, #8b5cf6 100%)",
          borderRadius: 7,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.6"
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
