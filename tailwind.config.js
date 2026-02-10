/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./renderer/index.html",
    "./renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        onyx: {
          dark: '#0f172a',
          light: '#1e293b',
          accent: '#38bdf8',
        },
      },
      keyframes: {
        'breathing-scale': {
          '0%, 100%': { transform: 'scale(1.02)' },
          '50%': { transform: 'scale(1.06)' },
        }
      },
      animation: {
        'breathing-scale': 'breathing-scale 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
