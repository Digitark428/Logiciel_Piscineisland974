import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Univers piscine : blanc / graphite / bleu piscine
        graphite: {
          50: "#f6f7f8",
          100: "#eceef0",
          200: "#d4d8dd",
          300: "#aeb5be",
          400: "#828c99",
          500: "#636e7c",
          600: "#4e5764",
          700: "#404752",
          800: "#373c45",
          900: "#20242b",
          950: "#131519",
        },
        pool: {
          50: "#eefbfd",
          100: "#d4f4f9",
          200: "#aee8f3",
          300: "#76d6ea",
          400: "#37bad9",
          500: "#1b9dbf",
          600: "#197ea1",
          700: "#1b6683",
          800: "#1f556c",
          900: "#1e485c",
          950: "#0e2f3f",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        float: "0 8px 30px rgba(16,24,40,0.08)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
