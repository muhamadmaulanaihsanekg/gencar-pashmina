import withBundleAnalyzer from '@next/bundle-analyzer';

const isExport = process.env.NEXT_OUTPUT_EXPORT === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produksi: frontend diekspor statis ke `out/` lalu dilayani Worker via binding ASSETS.
  // Dev: jalankan mode Next biasa (port 3012) dan proxy /api/* ke `wrangler dev` (8787),
  // sebab API kini hidup di server/api (dibundel Worker), bukan app/api.
  output: isExport ? 'export' : undefined,
  // trailingSlash hanya untuk export statis (out/), bukan dev — kalau tidak,
  // /api/health di-redirect 308 ke /api/health/.
  trailingSlash: isExport,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  // Rewrites tidak berlaku saat output: 'export', jadi jangan didaftarkan
  // sama sekali agar Next tidak mengeluarkan warning saat build produksi.
  ...(isExport
    ? {}
    : {
        async rewrites() {
          const api = process.env.DEV_API_URL || 'http://127.0.0.1:8787';
          return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
        },
      }),
  webpack: (config, { isServer }) => {
    config.infrastructureLogging = { level: 'error' };
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        jspdf: false,
        'jspdf-autotable': false,
        xlsx: false,
      };
    }
    return config;
  },
};

const analyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default analyzer(nextConfig);
