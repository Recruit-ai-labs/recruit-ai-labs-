/** @type {import('next').NextConfig} */
const nextConfig = {
  // PDF.js loads its native canvas helpers and worker through Node at runtime.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  outputFileTracingIncludes: {
    '/dashboard/discovery': ['./scripts/scout-extract.py'],
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        {
          key: 'Content-Security-Policy-Report-Only',
          value: "default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self' blob: https:; connect-src 'self' https: wss:; frame-src 'self' https:",
        },
      ],
    }];
  },
};
export default nextConfig;
