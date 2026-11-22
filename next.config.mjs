/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Images from Supabase Storage will be added in a later milestone when audio/UI assets are hosted.
  // Note: `typedRoutes` will be enabled once the module routes (/grammar, /diktat,
  // /schreiben) exist, so internal links are type-checked without false errors in M1.
};

export default nextConfig;
