import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hypermode: {
          bg: "#121212",
          card: "#1c1c1c",
          border: "#2a2a2a",
          hover: "#282828",
          input: "#222222",
          accent: "#9333ea", // Purple-600
          "accent-light": "#a855f7", // Purple-500
          "accent-dark": "#7e22ce", // Purple-700
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
