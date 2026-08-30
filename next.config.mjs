import { withWorkflow } from "workflow/next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,
  outputFileTracingIncludes: {
    "/.well-known/workflow/v1/step": [
      "node_modules/pdfkit/js/standard-fonts/**/*",
    ],
  },
  serverExternalPackages: ["heic-decode", "pdfkit"],
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
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withWorkflow(nextConfig);
