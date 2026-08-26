import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LETI",
    short_name: "LETI",
    description: "LETI, logiciel pour piscinistes : simple et puissant.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#F7F7F5",
    theme_color: "#F7F7F5",
    lang: "fr",
    icons: [
      {
        src: "/leti/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/leti/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
