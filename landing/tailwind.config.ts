import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A4FEE',
          hover: '#1440C7',
          container: '#EBF1FE',
        },
        secondary: {
          DEFAULT: '#0284C7',
          container: '#E0F2FE',
        },
        tertiary: {
          DEFAULT: '#F59E0B',
          container: '#FEF3C7',
        },
        canvas: '#F8FAFC',
        card: '#FFFFFF',
        subtle: '#F1F5F9',
        border: '#E2E8F0',
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '16px',
        full: '9999px',
      },
      fontSize: {
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1.05' }],
        '7xl': ['5rem', { lineHeight: '1' }],
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(250px, -150px) scale(1.3)' },
          '66%': { transform: 'translate(-180px, 180px) scale(0.85)' },
        },
        'scroll-x': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
          '100%': { transform: 'translateX(200%) skewX(-15deg)' },
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(26, 79, 238, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(26, 79, 238, 0)' },
        },
        'counter-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in-up': {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'accordion-down': {
          from: { maxHeight: '0px', opacity: '0' },
          to: { maxHeight: '1000px', opacity: '1' },
        },
        'accordion-up': {
          from: { maxHeight: '1000px', opacity: '1' },
          to: { maxHeight: '0px', opacity: '0' },
        },
      },
      animation: {
        blob: 'blob 18s ease-in-out infinite',
        'blob-delay-2': 'blob 22s ease-in-out infinite 4s',
        'blob-delay-3': 'blob 20s ease-in-out infinite 8s',
        'scroll-x': 'scroll-x 40s linear infinite',
        'scroll-x-reverse': 'scroll-x 40s linear infinite reverse',
        shimmer: 'shimmer 2.5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'counter-up': 'counter-up 0.6s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
}

export default config
