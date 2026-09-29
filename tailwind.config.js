/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './assets/js/main.js',
    './assets/js/motion.js',
    './assets/js/quote-form.js',
  ],
  theme: {
    extend: {
      colors: {
        // Official palette. Navy and orange are the two inks of the logo.
        navy: {
          DEFAULT: '#1A3659',
          muted: '#5F6F84', // secondary text on paper/sand/white (4.8:1 on paper)
        },
        orange: {
          DEFAULT: '#F37221', // accent: ribbon, markers, primary CTA surface. Never small text on light grounds.
        },
        paper: '#FAF7F2',
        sand: '#F1ECE3',
      },
      fontFamily: {
        sans: ['"Readex Pro"', 'Tahoma', 'Arial', 'sans-serif'],
        naskh: ['"Noto Naskh Arabic"', '"Traditional Arabic"', 'serif'],
      },
      maxWidth: {
        content: '82.5rem', // 1320px
      },
      screens: {
        nav: '1200px', // full desktop navigation from here up
      },
    },
  },
  plugins: [],
};
