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
        background: "#0f0f0f",
        foreground: "#ffffff",
        surface: {
          DEFAULT: "#1a1a1a",
          hover: "#242424",
        },
        accent: {
          DEFAULT: "#e8ff47",
          dark: "#c4d93c",
        },
        card: {
          DEFAULT: "#1a1a1a",
          hover: "#242424",
        },
        border: "#2a2a2a",
        muted: {
          DEFAULT: "#6b6b6b",
          foreground: "#a1a1a1",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        display: ["Barlow Condensed", "sans-serif"],
        body: ["Barlow", "sans-serif"],
      },
      borderRadius: {
        "xl": "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
