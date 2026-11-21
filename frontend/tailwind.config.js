/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kemenkeu: {
          dark: '#0f172a',       // Slate 900
          navy: '#1e3a8a',       // Blue 900
          blue: '#2563eb',       // Blue 600
          lightBlue: '#3b82f6',  // Blue 500
          gold: '#2563eb',       // Soft blue accent (no harsh yellow)
          goldHover: '#1d4ed8',  // Blue 700
          goldLight: '#eff6ff',  // Blue 50
          slate: '#475569',      // Slate 600
          border: '#e2e8f0',     // Slate 200
          bg: '#f8fafc',         // Slate 50
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#ef4444',
          cyan: '#06b6d4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
