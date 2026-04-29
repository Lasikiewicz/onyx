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
          '0%, 100%': { transform: 'scale(1.02) translateZ(0)' },
          '50%': { transform: 'scale(1.06) translateZ(0)' },
        },
        'slide-x': {
          '0%, 100%': { transform: 'translateX(0) scale(1.1)' },
          '50%': { transform: 'translateX(4px) scale(1.1)' },
        },
        'slide-x-reverse': {
          '0%, 100%': { transform: 'translateX(0) scale(1.1)' },
          '50%': { transform: 'translateX(-4px) scale(1.1)' },
        },
        'gentle-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1.1)' },
          '50%': { transform: 'translateY(-4px) scale(1.1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) scale(1.05)' },
          '50%': { transform: 'translateY(-2px) scale(1.1)' },
        },
        'wobble': {
          '0%, 100%': { transform: 'rotate(-4deg) scale(1.1)' },
          '50%': { transform: 'rotate(4deg) scale(1.1)' },
        },
        'play-pulse': {
          '0%, 100%': { transform: 'scale(1.0)' },
          '15%': { transform: 'scale(1.2)' },
          '30%': { transform: 'scale(1.05)' },
          '45%': { transform: 'scale(1.15)' },
          '60%': { transform: 'scale(1.0)' }
        },
        'edit-pen': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg) scale(1.1)' },
          '25%': { transform: 'translate(2px, -3px) rotate(10deg) scale(1.15)' },
          '50%': { transform: 'translate(-1px, 1px) rotate(-5deg) scale(1.1)' },
          '75%': { transform: 'translate(3px, -2px) rotate(5deg) scale(1.15)' }
        },
        'edit-image': {
          '0%, 100%': { transform: 'scale(1.1)' },
          '25%': { transform: 'scale(1.2) rotate(4deg)' },
          '75%': { transform: 'scale(1.2) rotate(-4deg)' }
        },
        'gear-spin': {
          '0%': { transform: 'rotate(0deg) scale(1.2)' },
          '100%': { transform: 'rotate(360deg) scale(1.2)' }
        },
        'pin-shake': {
          '0%, 100%': { transform: 'scale(1.1) rotate(0)' },
          '25%': { transform: 'translateY(-3px) scale(1.2) rotate(-15deg)' },
          '50%': { transform: 'translateY(0) scale(1.15) rotate(15deg)' },
          '75%': { transform: 'translateY(-3px) scale(1.2) rotate(-15deg)' },
        },
        'link-globe-spin': {
          '0%': { transform: 'rotateY(0deg) scale(1.15)' },
          '100%': { transform: 'rotateY(360deg) scale(1.15)' },
        },
        'link-bounce-in': {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '40%': { transform: 'scale(1.2) translateY(-3px)' },
          '60%': { transform: 'scale(0.95) translateY(1px)' },
          '80%': { transform: 'scale(1.1) translateY(-1px)' },
        }
      },
      animation: {
        'breathing-scale': 'breathing-scale 3s ease-in-out infinite',
        'slide-x': 'slide-x 2s ease-in-out infinite',
        'slide-x-reverse': 'slide-x-reverse 2s ease-in-out infinite',
        'gentle-bounce': 'gentle-bounce 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'wobble': 'wobble 2s ease-in-out infinite',
        'play-pulse': 'play-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'edit-pen': 'edit-pen 1.5s ease-in-out infinite',
        'edit-image': 'edit-image 2.5s ease-in-out infinite',
        'gear-spin': 'gear-spin 3s linear infinite',
        'pin-shake': 'pin-shake 0.8s ease-in-out infinite',
        'link-globe-spin': 'link-globe-spin 2s linear infinite',
        'link-bounce-in': 'link-bounce-in 0.6s ease-in-out',
      },
    },
  },
  plugins: [],
}
