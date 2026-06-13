/** @type {config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#F2B949',
          secondary: '#F2D394',
          accent: '#A67F32',
          dark: '#543D10',
          light: '#FFFDF9'
        }
      }
    },
  },
  plugins: [],
}