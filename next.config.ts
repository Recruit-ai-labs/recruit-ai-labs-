import type { NextConfig } from "next";

// The only bytes this site genuinely spends are image bytes: the hero plate
// and the partner marks. Everything else is type, rule lines and motion.
// So the optimiser is tuned rather than left on defaults:
//
//   · AVIF first, WebP second — a flat graphic like the hero plate lands at a
//     fraction of its PNG size, and every browser that can take it will.
//   · deviceSizes trimmed to the widths the layout actually lands on, so the
//     browser never spends bandwidth on a 2048px file for a 420px slot.
//   · a month of cache on the optimised variants: the URL is content-derived,
//     so a new asset is a new URL and there is nothing to invalidate.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [420, 640, 828, 1080, 1280, 1600, 1920, 2560],
    imageSizes: [96, 128, 200, 256, 336, 384],
    minimumCacheTTL: 2678400, // 31 days
  },
  experimental: {
    // This machine has 3.8GB of RAM, which is what actually sets the ceiling
    // on how fast the site can feel here — `next build` forks one compiler
    // worker per core, each with its own heap, and the run died partway
    // through static generation with "Zone Allocation failed – process out of
    // memory". One worker finishes, and the memory it no longer needs goes to
    // the browser instead.
    cpus: 1,
  },
};

export default nextConfig;
