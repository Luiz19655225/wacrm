import { ImageResponse } from "next/og";

// Default OG/share card for the whole app — used wherever a route
// doesn't define its own opengraph-image. Self-contained markup for
// the same reason as `icon.tsx`: this renders through Satori, which
// only understands a subset of CSS (flex-only layout, no custom
// @font-face loading without fetching font bytes ourselves) — so it
// intentionally uses the platform default sans rather than pulling
// in Inter Tight.
//
// Composition mirrors the approved primary lockup (symbol above
// wordmark above tagline) rather than the boxed glyph used for
// favicon/apple-icon — an OG card has room to show the real mark.

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const symbolData = await fetch(
    new URL("./brand-assets/wavon-symbol.png", import.meta.url),
  ).then((res) => res.arrayBuffer());
  const symbolSrc = `data:image/png;base64,${Buffer.from(symbolData).toString("base64")}`;

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
          gap: 20,
          background: "#0e0e16",
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(47,95,255,0.35), transparent 55%), radial-gradient(circle at 80% 75%, rgba(139,92,246,0.35), transparent 55%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={symbolSrc} width={176} height={120} alt="" />
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
