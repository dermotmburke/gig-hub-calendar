/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#f9f9f9',
        'on-surface': '#1b1b1b',
        primary: '#000000',
        'on-primary': '#ffffff',
        'surface-container': '#eeeeee',
        'surface-variant': '#e2e2e2',
      },
      borderRadius: {
        DEFAULT: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        full: '0px',
      },
      fontFamily: {
        headline: ['Space Grotesk', 'sans-serif'],
        body: ['Space Grotesk', 'sans-serif'],
        label: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        brutalist: '4px 4px 0px 0px #000000',
        'brutalist-sm': '2px 2px 0px 0px #000000',
      },
    },
  },
  plugins: [],
};
