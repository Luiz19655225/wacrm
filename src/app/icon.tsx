import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with the WAVON brand mark — a
// blue-to-violet gradient rounded square with the official symbol
// (cropped from the approved logo artwork) on top. Reads the PNG from
// src/app/brand-assets/ rather than public/ — `new URL(..., import.meta.url)`
// only resolves files the bundler can trace through the module graph,
// and public/ is excluded from that (it's a static passthrough folder).
// public/brand/wavon-symbol.png is a separate copy of the same file,
// used by the DOM-rendered <WavonMark> via next/image.
//
// This route takes precedence over src/app/favicon.ico, which is the
// Next.js default and can stay on disk harmlessly (or be removed).

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2f5fff 0%, #8b5cf6 100%)",
          borderRadius: 7,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={symbolSrc} width={24} height={16} alt="" />
      </div>
    ),
    { ...size },
  );
}
