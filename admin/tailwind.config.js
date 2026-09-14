/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      // Small phones (320-400px) have no room for the bars alongside the
      // code text — below this width only the code is shown, which is all
      // a person reads from the screen anyway. Scanning happens from the
      // printed form, not the phone.
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        emerald: {
          500: '#10B981',
          600: '#059669', // Milex primary brand color
          700: '#047857',
        }
      }
    },
  },
  plugins: [],
}