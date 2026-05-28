/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary: Vibrant purple/violet — kid-friendly, magical
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        // Accent: Sunny yellow/orange — pairs with purple
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        // Neon accents for highlights
        neon: {
          blue: '#3b82f6',
          purple: '#a855f7',
          green: '#10b981',
          pink: '#ec4899',
          yellow: '#facc15',
        },
        // Dark backgrounds: Soft navy/indigo instead of dark green
        dark: {
          900: '#0f0a1f',
          800: '#1a1233',
          700: '#241a47',
          600: '#2e215b',
          500: '#3b2a73',
          400: '#4c3690',
        },
      },
      fontFamily: {
        game: ['var(--font-orbitron)', 'monospace'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'spin-slow': 'spin 8s linear infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        wiggle: 'wiggle 1s ease-in-out infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px #a855f7, 0 0 10px #a855f7' },
          '50%': { boxShadow: '0 0 20px #a855f7, 0 0 40px #c084fc, 0 0 80px #ec4899' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          from: { textShadow: '0 0 10px #a855f7' },
          to: { textShadow: '0 0 20px #c084fc, 0 0 40px #ec4899' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      backgroundImage: {
        // Colorful gradient background — kid-friendly
        'game-gradient': 'linear-gradient(135deg, #1a1233 0%, #3b2a73 35%, #6b21a8 70%, #a855f7 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(216,180,254,0.12) 0%, rgba(168,85,247,0.06) 100%)',
        'neon-gradient': 'linear-gradient(90deg, #a855f7, #ec4899, #facc15)',
        'rainbow-gradient': 'linear-gradient(90deg, #ef4444, #f59e0b, #facc15, #10b981, #3b82f6, #a855f7, #ec4899)',
        'danger-gradient': 'linear-gradient(90deg, #ef4444, #f97316)',
        'success-gradient': 'linear-gradient(90deg, #10b981, #facc15)',
      },
      boxShadow: {
        'neon-blue': '0 0 15px rgba(59, 130, 246, 0.6)',
        'neon-purple': '0 0 15px rgba(168, 85, 247, 0.6)',
        'neon-green': '0 0 15px rgba(16, 185, 129, 0.6)',
        'neon-pink': '0 0 15px rgba(236, 72, 153, 0.6)',
        'neon-yellow': '0 0 15px rgba(250, 204, 21, 0.6)',
        card: '0 8px 32px rgba(168, 85, 247, 0.25)',
        'inner-glow': 'inset 0 0 20px rgba(168, 85, 247, 0.18)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
