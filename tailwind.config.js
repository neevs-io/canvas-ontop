module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
    "./options.html"
  ],
  theme: {
    extend: {
      colors: {
        'neu-red': '#CC0000',
        'canvas-teal': '#00A79D',
        'base-bg': '#F9FAFB',
        'text-dark': '#333333',
        'border-light': '#E5E7EB',
      },
      fontFamily: {
        sans: ['Lato', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};