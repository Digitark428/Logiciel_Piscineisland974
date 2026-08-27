/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "umrjrpbritekqcfqkhxz.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["heic-decode"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
