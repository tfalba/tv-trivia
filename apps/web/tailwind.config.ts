import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        trivia: {
          ink: "#000000",
          green: "#209d5c",
          blue: "#2b70e4",
          gold: "#ffd034",
          paper: "#ebe8e8df",
          slate: "#0f172a",
        },
      },
      fontFamily: {
        display: ['"Archivo Black"', "sans-serif"],
        body: ['"Space Grotesk"', "sans-serif"],
      },
      boxShadow: {
        card: "0 16px 32px rgba(0, 0, 0, 0.16)",
      },
      backgroundImage: {
        "trivia-grid":
          "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.07) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
