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
    },
  },
  plugins: [],
}
