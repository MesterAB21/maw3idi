/** @type {import('next').NextConfig} */
const API_BACKEND = process.env.API_BACKEND_URL || "https://maw3idi-backend.onrender.com";

const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_BACKEND}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;