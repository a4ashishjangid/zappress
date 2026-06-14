/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  important: '.zappress-admin-wrap',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#DBEAFE',
        },
        success: {
          DEFAULT: '#22C55E',
          dark: '#15803D',
          light: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#B45309',
          light: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#EF4444',
          dark: '#B91C1C',
          light: '#FEE2E2',
        },
      },
    },
  },
  plugins: [],
}
