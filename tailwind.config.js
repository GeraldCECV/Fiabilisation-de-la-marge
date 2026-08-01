/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#333333",
        sub: "#6B7676",
        accent: "#78BDC0",
        bg: "#E8F5F4",
        surface: "#FFFFFF",
        border: "#D0EAE7",
        pos: "#B5BC61",
        neg: "#EC655D",
      },
    },
  },
  plugins: [],
};
