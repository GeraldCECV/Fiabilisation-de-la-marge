/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1E2A32",
        sub: "#5B6B74",
        accent: "#B8863E",
        bg: "#F5F4EF",
        surface: "#FFFFFF",
        border: "#E1DDD0",
        pos: "#3F6B4F",
        neg: "#A6423B",
      },
    },
  },
  plugins: [],
};
