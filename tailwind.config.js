/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'turbo-blue': '#0066CC',
        'turbo-blue-dark': '#0052A3',
      },
    },
  },
  plugins: [],
}
