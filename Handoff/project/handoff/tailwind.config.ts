/* Fitkis v5 · tailwind.config.ts — drop-in */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0a',
          2: '#1a1a1a',
          3: '#404040',
          4: '#737373',
          5: '#a3a3a3',
          6: '#d4d4d4',
          7: '#e5e5e5',
        },
        paper: {
          DEFAULT: '#fafaf7',
          2: '#f5f4ef',
          3: '#eceae2',
        },
        cream:  '#f8f3e8',
        signal: { DEFAULT: '#ff5a1f', 2: '#ff7a44', soft: '#ffe8dd' },
        leaf:   { DEFAULT: '#4a7c3a', soft: '#e4ecd6' },
        berry:  { DEFAULT: '#c13b5a', soft: '#f6dde2' },
        honey:  { DEFAULT: '#d4a017', soft: '#f5ead0' },
        sky:    { DEFAULT: '#3a6b8c', soft: '#dbe6ef' },
      },
      fontFamily: {
        serif: ['var(--f-serif)', 'serif'],
        sans:  ['var(--f-sans)', 'system-ui'],
        mono:  ['var(--f-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
      },
      fontSize: {
        eyebrow: ['10px', { letterSpacing: '0.14em', lineHeight: '1' }],
      },
      keyframes: {
        'fk-pulse': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'fk-pulse': 'fk-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
