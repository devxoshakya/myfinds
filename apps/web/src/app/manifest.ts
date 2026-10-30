import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyFinds",
    short_name: "MyFinds",
    description:
      "Report a lost or found item at any metro, railway, or bus station. MyFinds matches it and makes sure it reaches the real owner.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F5F7",
    theme_color: "#111111",
    icons: [
      {
        src: "/favicon/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
