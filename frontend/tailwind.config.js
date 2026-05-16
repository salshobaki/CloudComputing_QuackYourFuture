/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          600: '#4F46E5',
        },
      },
    },
  },
  plugins: [],
}

