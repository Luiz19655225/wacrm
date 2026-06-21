import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WAVON",
    short_name: "WAVON",
    description: "WAVON — CRM omnichannel para WhatsApp.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0e16",
    theme_color: "#0e0e16",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
