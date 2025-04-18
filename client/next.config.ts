import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    domains:   ['i.scdn.co', '127.0.0.1'],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
}

export default nextConfig

