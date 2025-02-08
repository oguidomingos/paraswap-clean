/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#111827',
        primary: {
          DEFAULT: '#60a5fa',
          dark: '#3b82f6',
        },
        secondary: {
          DEFAULT: '#a855f7',
          dark: '#9333ea',
        },
      },
      boxShadow: {
        'glow': '0 0 15px rgba(96, 165, 250, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
