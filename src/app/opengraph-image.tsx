import { ImageResponse } from "next/og";

// Default OG/share card for the whole app — used wherever a route
// doesn't define its own opengraph-image. Self-contained markup for
// the same reason as `icon.tsx`: this renders through Satori, which
// only understands a subset of CSS (flex-only layout, no custom
// @font-face loading without fetching font bytes ourselves) — so it
// intentionally uses the platform default sans rather than pulling
// in Inter Tight.

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "#0e0e16",
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(47,95,255,0.35), transparent 55%), radial-gradient(circle at 80% 75%, rgba(139,92,246,0.35), transparent 55%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 22,
            background: "linear-gradient(135deg, #2f5fff 0%, #8b5cf6 100%)",
          }}
        >
          <svg
            width="52"
            height="52"
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
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            letterSpacing: -2,
            color: "#ffffff",
          }}
        >
          WAVON
        </div>
        <div style={{ fontSize: 28, color: "#b4b4c6" }}>
          CRM omnichannel para WhatsApp
        </div>
      </div>
    ),
    { ...size },
  );
}
