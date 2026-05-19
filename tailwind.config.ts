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
        primary: {
          50: '#f7fcf5',
          100: '#e5f5e0',
          200: '#c7e9c0',
          300: '#a1d99b',
          400: '#74c476',
          500: '#41ab5d',
          600: '#238b45',
          700: '#006d2c',
          800: '#005121',
          900: '#00441b',
          950: '#042412',
        },
        accent: {
          50: '#f7fcf5',
          100: '#e5f5e0',
          200: '#c7e9c0',
          300: '#a1d99b',
          400: '#74c476',
          500: '#41ab5d',
          600: '#238b45',
          700: '#006d2c',
          800: '#005121',
          900: '#00441b',
          950: '#042412',
        },
        neon: {
          blue: '#41ab5d',
          purple: '#74c476',
          green: '#41ab5d',
          pink: '#006d2c',
          yellow: '#c7e9c0',
        },
        dark: {
          900: '#041008',
          800: '#06170c',
          700: '#082011',
          600: '#0d2b18',
          500: '#123820',
          400: '#1b4a2b',
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
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px #41ab5d, 0 0 10px #41ab5d' },
          '50%': { boxShadow: '0 0 20px #41ab5d, 0 0 40px #238b45, 0 0 80px #006d2c' },
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
          from: { textShadow: '0 0 10px #41ab5d' },
          to: { textShadow: '0 0 20px #41ab5d, 0 0 40px #238b45' },
        },
      },
      backgroundImage: {
        'game-gradient': 'linear-gradient(135deg, #041008 0%, #082011 48%, #00441b 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(229,245,224,0.08) 0%, rgba(65,171,93,0.04) 100%)',
        'neon-gradient': 'linear-gradient(90deg, #41ab5d, #74c476)',
        'danger-gradient': 'linear-gradient(90deg, #00441b, #238b45)',
        'success-gradient': 'linear-gradient(90deg, #238b45, #74c476)',
      },
      boxShadow: {
        'neon-blue': '0 0 15px rgba(65, 171, 93, 0.5)',
        'neon-purple': '0 0 15px rgba(116, 196, 118, 0.45)',
        'neon-green': '0 0 15px rgba(65, 171, 93, 0.45)',
        'neon-pink': '0 0 15px rgba(0, 109, 44, 0.45)',
        card: '0 8px 32px rgba(0, 68, 27, 0.22)',
        'inner-glow': 'inset 0 0 20px rgba(65, 171, 93, 0.14)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
