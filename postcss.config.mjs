/**
 * PostCSS pipeline.
 * Tailwind CSS v4 is loaded as a PostCSS plugin and configured CSS-first
 * (see the `@theme` block in src/app/globals.css) — no tailwind.config.js needed.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
