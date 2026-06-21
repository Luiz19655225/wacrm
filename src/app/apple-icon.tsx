import { ImageResponse } from "next/og";

// Apple touch icon (home screen / bookmarks on iOS). Full-bleed
// gradient square, no transparency, with the official symbol
// (cropped from the approved logo artwork) on top — no baked-in
// corner rounding, since iOS applies its own mask shape; a
// transparent or already-rounded source produces a halo/double
// border on the home screen. See icon.tsx for why this reads the
// asset from brand-assets/ instead of public/.

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={symbolSrc} width={120} height={82} alt="" />
      </div>
    ),
    { ...size },
  );
}
