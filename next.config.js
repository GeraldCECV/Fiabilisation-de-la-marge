/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/export-fiche/[id]": ["./lib/templates/**"],
    },
  },
};
module.exports = nextConfig;
