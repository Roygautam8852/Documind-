import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neon lime accent palette (matching the design in user image)
        neon: {
          50:  '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#b6f526',
          DEFAULT: '#b6f526',
          600: '#90d115',
          700: '#4d7c0f',
          800: '#3f6212',
          900: '#365314',
        },
        // Echo theme colors
        echo: {
          dark: '#111215',
          sidebar: '#16171b',
          cardDark: '#1c1e24',
          borderDark: '#262933',
          canvas: '#f4f5f7',
          cardLight: '#ffffff',
          borderLight: '#e5e7eb',
        },
        // Brand palette — neon-forward with neutral charcoal backgrounds
        brand: {
          50:  '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#b6f526',
          600: '#94db12',
          700: '#7bb80d',
          800: '#5e8d0a',
          900: '#365314',
          950: '#111215',
        },
        // Dark surface palette
        surface: {
          0:   '#0d0e10',   // deepest obsidian
          50:  '#111215',   // sidebar background
          100: '#16171b',   // dark panels
          200: '#1c1e24',   // elevated cards
          300: '#262933',   // dividers
          400: '#3c404d',   // subtle muted
          500: '#7e8494',   // muted text
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
