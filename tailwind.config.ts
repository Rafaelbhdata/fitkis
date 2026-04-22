/**
 * Fitkis v5 · "Paper & Pulse"
 * Light warm paper + mandarina signal accent
 */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Ink scale (dark text/bg) ────────────────
        ink: {
          DEFAULT: '#0a0a0a',
          2: '#1a1a1a',
          3: '#404040',
          4: '#737373',
          5: '#a3a3a3',
          6: '#d4d4d4',
          7: '#e5e5e5',
        },
        // ── Paper scale (light bg) ──────────────────
        paper: {
          DEFAULT: '#fafaf7',
          2: '#f5f4ef',
          3: '#eceae2',
        },
        cream: '#f8f3e8',
        // ── Signal: mandarina (hero accent) ─────────
        signal: {
          DEFAULT: '#ff5a1f',
          2: '#ff7a44',
          soft: '#ffe8dd',
        },
        // ── Semantic colors ─────────────────────────
        leaf: { DEFAULT: '#4a7c3a', soft: '#e4ecd6' },   // verdura / éxito
        berry: { DEFAULT: '#c13b5a', soft: '#f6dde2' },  // proteína / alerta
        honey: { DEFAULT: '#d4a017', soft: '#f5ead0' },  // carb / calidez
        sky: { DEFAULT: '#3a6b8c', soft: '#dbe6ef' },    // recovery / info
        // ── Food groups (semantic mapping) ──────────
        food: {
          verdura: '#4a7c3a',
          fruta: '#ff5a1f',
          carb: '#d4a017',
          leguminosa: '#3a6b8c',
          proteina: '#c13b5a',
          grasa: '#737373',
        },
        // ── Legacy mappings for migration ───────────
        background: '#fafaf7',
        foreground: '#0a0a0a',
        surface: {
          DEFAULT: '#ffffff',
          elevated: '#f5f4ef',
          2: '#eceae2',
        },
        muted: {
          DEFAULT: '#737373',
          foreground: '#404040',
        },
        border: {
          DEFAULT: '#e5e5e5',
          subtle: '#eceae2',
          strong: '#d4d4d4',
        },
      },
      fontFamily: {
        serif: ['var(--f-serif)', 'Times New Roman', 'serif'],
        sans: ['var(--f-sans)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--f-mono)', 'ui-monospace', 'monospace'],
        // Legacy aliases
        display: ['var(--f-serif)', 'serif'],
        body: ['var(--f-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        eyebrow: ['10px', { letterSpacing: '0.14em', lineHeight: '1' }],
        'display-2xl': ['3.5rem', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '300' }],
        'display-xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '300' }],
        'display-lg': ['2.25rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '400' }],
        'display-md': ['1.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '400' }],
        'display-sm': ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '500' }],
        'display-xs': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '500' }],
        label: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.14em', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        md: '12px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
        '3xl': '28px',
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(10,10,10,0.08)',
        'card-hi': '0 8px 24px -8px rgba(10,10,10,0.12)',
        dock: '0 14px 40px rgba(10,10,10,0.25)',
        'inner-light': 'inset 0 1px 0 0 rgba(255,255,255,0.5)',
      },
      screens: {
        xs: '375px',
        md: '768px',
      },
      spacing: {
        sidebar: '220px',
        dock: '78px', // Mobile dock height + safe area
      },
      keyframes: {
        'fk-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fk-pulse': 'fk-pulse 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
