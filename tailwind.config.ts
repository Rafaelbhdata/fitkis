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
        // New dark, data-heavy design tokens (Whoop-inspired)
        background: "#080808",
        foreground: "#f5f5f5",
        surface: {
          DEFAULT: "#0f0f0f",
          elevated: "#141414",
          hover: "#1a1a1a",
        },
        accent: {
          DEFAULT: "#10b981",
          dim: "#064e3b",
          muted: "#10b98120",
          glow: "#10b98140",
        },
        muted: {
          DEFAULT: "#525252",
          foreground: "#a3a3a3",
        },
        border: {
          DEFAULT: "#242424",
          subtle: "#1a1a1a",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        // Food group colors
        food: {
          verdura: "#22c55e",
          fruta: "#f97316",
          carb: "#eab308",
          leguminosa: "#a855f7",
          proteina: "#ef4444",
          grasa: "#3b82f6",
        },
      },
      fontFamily: {
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-2xl": ["3.5rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-xl": ["3rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-md": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "display-sm": ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "display-xs": ["0.875rem", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "600" }],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "glow": "0 0 20px -5px var(--tw-shadow-color)",
        "glow-sm": "0 0 10px -3px var(--tw-shadow-color)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.03)",
        "card": "0 2px 8px -2px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-subtle": "linear-gradient(180deg, rgba(16,185,129,0.03) 0%, transparent 50%)",
        "noise": "url('/noise.svg')",
      },
      screens: {
        "xs": "375px",
        "md": "768px", // Desktop breakpoint for sidebar
      },
      spacing: {
        "sidebar": "220px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-subtle": "pulseSub 2s ease-in-out infinite",
        "pulse-slow": "pulseSlow 3s ease-in-out infinite",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "slide-in-left": "slideInLeft 0.25s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSub: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        pulseSlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(168, 85, 247, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(168, 85, 247, 0)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
