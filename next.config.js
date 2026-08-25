/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_MOMO_PHONE: process.env.NEXT_PUBLIC_MOMO_PHONE || process.env.MOMO_PHONE,
    NEXT_PUBLIC_MOMO_NAME: process.env.NEXT_PUBLIC_MOMO_NAME || process.env.MOMO_NAME,
    NEXT_PUBLIC_BINANCE_PAY_ID: process.env.NEXT_PUBLIC_BINANCE_PAY_ID || process.env.BINANCE_PAY_ID,
  },
};

module.exports = nextConfig;

