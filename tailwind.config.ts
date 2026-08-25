import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        pixel: "3px 3px 0px 0px rgba(0,0,0,0.8)",
        "pixel-sm": "2px 2px 0px 0px rgba(0,0,0,0.8)",
        "pixel-lg": "4px 4px 0px 0px rgba(0,0,0,0.9)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
