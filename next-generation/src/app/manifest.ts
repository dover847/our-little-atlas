import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Our Little Atlas",
    short_name: "Our Atlas",
    description: "A private little world for two curious minds.",
    start_url: "/space",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#faf9f5",
    theme_color: "#30493a",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
