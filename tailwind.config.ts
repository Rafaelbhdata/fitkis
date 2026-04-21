import type { Config } from "tailwindcss";

/**
 * Fitkis v4 · "Atlético Vital"
 * Dark slate premium + cyan eléctrico + pink signal
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Base ────────────────────────────
        background: "#0a0e1a",
        foreground: "#f4f6fb",
        surface: {
          DEFAULT: "#141a2b",
          elevated: "#1c2338",
          2: "#242c45",
          hi: "#2f3957",
          hover: "#1c2338",
        },
        // ── Primary: cyan eléctrico ─────────
        cyan: {
          DEFAULT: "#22e4d9",
          dim: "#0e8c86",
          muted: "rgba(34,228,217,0.12)",
          glow: "rgba(34,228,217,0.35)",
        },
        // ── Signal: pink ────────────────────
        pink: {
          DEFAULT: "#ff5277",
          dim: "#a31e3f",
          muted: "rgba(255,82,119,0.12)",
          glow: "rgba(255,82,119,0.35)",
        },
        // ── Secondary accents ───────────────
        lime: {
          DEFAULT: "#c7f264",
          muted: "rgba(199,242,100,0.12)",
        },
        amber: {
          DEFAULT: "#ffb547",
          muted: "rgba(255,181,71,0.12)",
        },
        violet: {
          DEFAULT: "#9f7bff",
          muted: "rgba(159,123,255,0.12)",
          glow: "rgba(159,123,255,0.35)",
        },
        // Legacy alias so old code with `accent-*` keeps working during migration
        accent: {
          DEFAULT: "#22e4d9",
          dim: "#0e8c86",
          muted: "rgba(34,228,217,0.12)",
          glow: "rgba(34,228,217,0.35)",
        },
        muted: {
          DEFAULT: "#6b7491",
          foreground: "#a8b0c5",
        },
        border: {
          DEFAULT: "#1f2740",
          subtle: "#161d32",
          strong: "#2d3758",
        },
        success: "#c7f264",
        warning: "#ffb547",
        danger: "#ff5277",
        // ── Food groups (semantic) ──────────
        food: {
          verdura: "#7ed957",
          fruta: "#ff8a5c",
          carb: "#ffce4a",
          leguminosa: "#22e4d9",
          proteina: "#ff5277",
          grasa: "#9f7bff",
        },
      },
      fontFamily: {
        display: ["var(--font-geist)", "system-ui", "sans-serif"],
        body: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        editorial: ["var(--font-instrument)", "Georgia", "serif"],
        // legacy aliases
        outfit: ["var(--font-geist)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-2xl": ["3.5rem", { lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "700" }],
        "display-xl": ["3rem", { lineHeight: "1", letterSpacing: "-0.035em", fontWeight: "700" }],
        "display-lg": ["2.25rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display-md": ["1.5rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-sm": ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "display-xs": ["0.875rem", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "600" }],
        "label": ["0.6875rem", { lineHeight: "1", letterSpacing: "0.14em", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        md: "10px",
        lg: "14px",
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        glow: "0 0 20px -5px var(--tw-shadow-color)",
        "glow-sm": "0 0 10px -3px var(--tw-shadow-color)",
        "glow-cyan": "0 0 40px rgba(34,228,217,0.35)",
        "glow-pink": "0 0 40px rgba(255,82,119,0.35)",
        "glow-violet": "0 0 40px rgba(159,123,255,0.35)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.04)",
        card: "0 2px 8px -2px rgba(0,0,0,0.5)",
        "card-hi": "0 20px 60px -20px rgba(0,0,0,0.55)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-vital": "linear-gradient(135deg, rgba(34,228,217,0.12), rgba(255,82,119,0.08))",
        "gradient-coach": "linear-gradient(135deg, #9f7bff, #ff5277)",
        "gradient-subtle": "linear-gradient(180deg, rgba(34,228,217,0.04) 0%, transparent 50%)",
        "noise": "url('/noise.svg')",
      },
      screens: {
        xs: "375px",
        md: "768px",
      },
      spacing: {
        sidebar: "220px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "pulse-subtle": "pulseSub 2s ease-in-out infinite",
        "pulse-cyan": "pulseCyan 2s ease-in-out infinite",
        "pulse-pink": "pulsePink 2s ease-in-out infinite",
        "pulse-slow": "pulseSlow 3s ease-in-out infinite",
        "flame": "flame 1.8s ease-in-out infinite",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "slide-in-left": "slideInLeft 0.25s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSub: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        pulseCyan: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(34,228,217,0.5)" },
          "50%": { boxShadow: "0 0 0 14px rgba(34,228,217,0)" },
        },
        pulsePink: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,82,119,0.5)" },
          "50%": { boxShadow: "0 0 0 14px rgba(255,82,119,0)" },
        },
        pulseSlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(159,123,255,0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(159,123,255,0)" },
        },
        flame: {
          "0%, 100%": { transform: "scale(1) rotate(-2deg)", filter: "drop-shadow(0 0 8px rgba(255,181,71,0.6))" },
          "50%": { transform: "scale(1.08) rotate(2deg)", filter: "drop-shadow(0 0 14px rgba(255,181,71,0.9))" },
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
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
