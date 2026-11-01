import type { MetadataRoute } from "next";

// ------------------------------------------------------------------
//  The web app manifest.
//
//  Next serves this at /manifest.webmanifest and links it from every page,
//  which is what lets a phone offer "Add to Home Screen" and open the
//  workspace in its own window with no browser address bar. The install is
//  only worth offering now that the shell has a real mobile navigation (the
//  bottom bar) — an install that opened a desktop page in a phone window
//  would be worse than no install at all.
//
//  `start_url` is the workspace, not the marketing landing: someone who adds
//  this to their home screen is a job seeker returning to their feed, not a
//  visitor reading a brochure.
// ------------------------------------------------------------------

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recruit AI — Job seeker",
    short_name: "Recruit AI",
    description:
      "The job seeker workspace: your feed, your network and your profile in one place.",
    start_url: "/seeker",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f6",
    theme_color: "#171714",
    icons: [
      {
        // A 500×500 square mark, so it reads correctly both as an icon and
        // maskable (the safe zone keeps the wordmark clear of a circle crop).
        src: "/recruit-ai-logo.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/recruit-ai-logo.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
