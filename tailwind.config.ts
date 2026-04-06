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
        background: "#050505",
        foreground: "#fafaf9",
        surface: {
          DEFAULT: "#0a0a0a",
          elevated: "#111111",
          hover: "#161616",
        },
        accent: {
          DEFAULT: "#10b981",
          muted: "#10b98120",
          glow: "#10b98140",
        },
        muted: {
          DEFAULT: "#52525b",
          foreground: "#a1a1aa",
        },
        border: {
          DEFAULT: "#18181b",
          subtle: "#27272a",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        // Food group colors - más sofisticados
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
        "display-xl": ["3rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-md": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "display-sm": ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "glow": "0 0 20px -5px var(--tw-shadow-color)",
        "glow-sm": "0 0 10px -3px var(--tw-shadow-color)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.05)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-subtle": "linear-gradient(180deg, rgba(16,185,129,0.03) 0%, transparent 50%)",
        "noise": "url('/noise.svg')",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-subtle": "pulseSub 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSub: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
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
