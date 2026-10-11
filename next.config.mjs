/** @type {import('next').NextConfig} */
const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const config = {
  images: {
    remotePatterns: storage?.protocol === "https:" ? [{
      protocol: "https", hostname: storage.hostname, port: storage.port,
      pathname: "/storage/v1/object/public/carousel-images/**", search: "",
    }] : [],
  },
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
};
export default config;
