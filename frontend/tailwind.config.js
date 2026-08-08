/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark theme base
        background: '#0A0A0F',
        surface: '#111118',
        surfaceElevated: '#16161F',
        surfaceHover: '#1C1C28',

        // Borders
        borderSubtle: '#1E1E2E',
        borderDefault: '#2A2A3E',
        borderStrong: '#3A3A54',

        // Text hierarchy
        textPrimary: '#F0F0FF',
        textSecondary: '#9090B8',
        textMuted: '#5A5A7A',
        textDisabled: '#3A3A54',

        // Brand accent — vibrant violet/indigo
        accent: '#7C3AED',
        accentLight: '#8B5CF6',
        accentGlow: 'rgba(124, 58, 237, 0.25)',
        accentHover: '#6D28D9',

        // Semantic colors
        success: '#10B981',
        successBg: 'rgba(16, 185, 129, 0.1)',
        warning: '#F59E0B',
        warningBg: 'rgba(245, 158, 11, 0.1)',
        danger: '#EF4444',
        dangerBg: 'rgba(239, 68, 68, 0.1)',
        info: '#3B82F6',
        infoBg: 'rgba(59, 130, 246, 0.1)',

        // Severity colors
        critical: '#FF3B3B',
        high: '#FF6B35',
        medium: '#FFB800',
        low: '#7CB9E8',
        positive: '#10B981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Inter', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['13px', '20px'],
        base: ['14px', '22px'],
        lg: ['16px', '24px'],
        xl: ['18px', '28px'],
        '2xl': ['22px', '32px'],
        '3xl': ['28px', '36px'],
        '4xl': ['36px', '44px'],
        '5xl': ['48px', '56px'],
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        fadeIn: 'fadeIn 200ms ease-out',
        fadeInUp: 'fadeInUp 250ms ease-out',
        slideIn: 'slideIn 200ms ease-out',
        slideInRight: 'slideInRight 250ms ease-out',
        slideDown: 'slideDown 300ms ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        typewriter: 'typewriter 0.05s steps(1) infinite',
        float: 'float 6s ease-in-out infinite',
        scanline: 'scanline 8s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 8px rgba(124,58,237,0.3)' },
          '100%': { boxShadow: '0 0 24px rgba(124,58,237,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(124,58,237,0.3)',
        glowLg: '0 0 40px rgba(124,58,237,0.4)',
        card: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.24)',
        panel: '0 4px 16px rgba(0,0,0,0.5)',
        modal: '0 20px 60px rgba(0,0,0,0.7)',
        floating: '0 8px 32px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0A0A0F 0%, #111118 100%)',
        'gradient-glow': 'radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%)',
        'grid-pattern': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='rgba(124,58,237,0.05)' stroke-width='1'/%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
};
