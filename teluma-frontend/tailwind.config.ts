import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A",
        secondary: "#10B981",
        tertiary: "#3B82F6",
        surface: "#F8F9FF",
        "surface-container": "#E5EEFF",
        "surface-container-low": "#EFF4FF",
        "surface-container-highest": "#D3E4FE",
        "on-surface": "#0B1C30",
        "on-surface-variant": "#45464D",
        "outline-variant": "#C6C6CD",
        "secondary-container": "#6CF8BB",
        "on-secondary-container": "#00714D",
        "error": "#BA1A1A",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;