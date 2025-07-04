/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        dbc: {
          'dark-green': '#034638',
          'light-green': '#00BF6F',
          'bright-green': '#D8E142',
          'pure-white': '#ffffff',
          'pure-black': '#000000',
        }
      },
      fontFamily: {
        'almarena': ['Almarena Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 