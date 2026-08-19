import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tokens LETI : les alias historiques restent pour éviter toute
        // duplication de classes, mais utilisent désormais la palette LETI.
        graphite: {
          50: "#F7F7F5",
          100: "#EEF0EF",
          200: "#DDE3E4",
          300: "#C2CDD1",
          400: "#8A9AA5",
          500: "#667A87",
          600: "#4A6271",
          700: "#344F63",
          800: "#26455D",
          900: "#183A59",
          950: "#102D47",
        },
        pool: {
          50: "#F1FBFD",
          100: "#DCF5FA",
          200: "#BDEBF5",
          300: "#96E0EE",
          400: "#78D8EC",
          500: "#5FC6E3",
          600: "#38A8C9",
          700: "#247D9B",
          800: "#205E77",
          900: "#1B4B64",
          950: "#12384E",
        },
        coral: {
          50: "#FFF6F4",
          100: "#FDE7E2",
          200: "#F9CEC7",
          300: "#F7B7AE",
          400: "#F6A197",
          500: "#F48B82",
          600: "#DC6F68",
          700: "#B95250",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(24,58,89,0.025), 0 5px 18px rgba(24,58,89,0.035)",
        float: "0 14px 36px rgba(24,58,89,0.12)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
