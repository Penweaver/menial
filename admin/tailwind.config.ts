import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Electric Royal Cobalt Brand Palette
        primary: {
          DEFAULT: '#1A4FEE', // Electric Royal Cobalt (from logo)
          hover: '#1440C7',
          container: '#1A4FEE',
          'on-container': '#FFFFFF',
          fixed: '#C9D8FC',
          light: '#EBF1FE',
        },
        secondary: {
          DEFAULT: '#10B981', // Mint / Jade Kinetic Green
          container: '#ECFDF5',
          'on-container': '#065F46',
          fixed: '#6FFBBE',
        },
        tertiary: {
          DEFAULT: '#F59E0B', // Amber Gold
          container: '#FEF3C7',
          'on-container': '#92400E',
          fixed: '#FFDDB8',
        },
        surface: {
          DEFAULT: '#FFFFFF', // Card surface
          canvas: '#F8FAFC',  // Slate-50 Canvas base
          input: '#F1F5F9',   // Slate-100 Container
          border: '#E2E8F0',  // Border outline
          muted: '#64748B',   // Slate-500 secondary
          dark: '#0F172A',    // Midnight Slate primary text
        },
        error: {
          DEFAULT: '#DC2626',
          container: '#FEE2E2',
          'on-container': '#991B1B',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px', // Main card radius per DESIGN.md
        '2xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
        card: '0 2px 4px rgba(15, 23, 42, 0.04)',
        header: '0 4px 12px rgba(26, 79, 238, 0.06)',
        modal: '0 12px 32px rgba(15, 23, 42, 0.12)',
      },
      spacing: {
        'space-xs': '0.25rem', // 4px
        'space-sm': '0.5rem',  // 8px
        'space-md': '0.75rem', // 12px
        'space-lg': '1rem',    // 16px
        'space-xl': '1.5rem',  // 24px
      },
    },
  },
  plugins: [],
};

export default config;