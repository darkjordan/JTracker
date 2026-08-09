import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JTracker — Money Tracker",
    short_name: "JTracker",
    description: "Track income, expenses, and tax relief.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Lets the OS share sheet offer "JTracker" as a target for a shared
    // photo (e.g. a receipt from the gallery). Received at /share-target,
    // which hands off into the existing scan-capture review flow.
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        files: [{ name: "file", accept: ["image/*"] }],
      },
    },
  } as MetadataRoute.Manifest;
}
