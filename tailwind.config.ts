import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#142033",
        genba: "#0f67b1",
        skysoft: "#e8f4ff",
        line: "#d9e6f2"
      },
      boxShadow: {
        soft: "0 18px 40px rgba(21, 52, 91, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
