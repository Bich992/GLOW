import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        timt: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff',
          light: '#fef3c7',
          dark: '#d97706',
        },
        surface: {
          base: '#050505',
          card: '#0d0d0d',
        },
        glow: {
          high: '#E0F7FA',
          mid:  '#FFB300',
          low:  '#FF3D00',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-timt': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'countdown-warning': {
          '0%, 100%': { color: 'hsl(var(--destructive))' },
          '50%': { color: 'hsl(var(--destructive) / 0.5)' },
        },
        flicker: {
          '0%':   { opacity: '1' },
          '8%':   { opacity: '0.25' },
          '12%':  { opacity: '0.9' },
          '20%':  { opacity: '0.3' },
          '28%':  { opacity: '1' },
          '45%':  { opacity: '0.4' },
          '55%':  { opacity: '0.85' },
          '70%':  { opacity: '0.2' },
          '80%':  { opacity: '1' },
          '90%':  { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        surge: {
          '0%':   { transform: 'scaleX(1)' },
          '30%':  { transform: 'scaleX(1.06)' },
          '60%':  { transform: 'scaleX(0.98)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'accordion-down':   'accordion-down 0.2s ease-out',
        'accordion-up':     'accordion-up 0.2s ease-out',
        'pulse-timt':       'pulse-timt 2s ease-in-out infinite',
        'countdown-warning':'countdown-warning 1s ease-in-out infinite',
        flicker:            'flicker 0.8s ease-in-out infinite',
        surge:              'surge 0.4s ease-out',
      },
      boxShadow: {
        'bloom-cyan':   '0 0 18px rgba(224,247,250,0.35), 0 0 6px rgba(224,247,250,0.6)',
        'bloom-amber':  '0 0 18px rgba(255,179,0,0.35),  0 0 6px rgba(255,179,0,0.6)',
        'bloom-red':    '0 0 22px rgba(255,61,0,0.45),   0 0 8px rgba(255,61,0,0.7)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
