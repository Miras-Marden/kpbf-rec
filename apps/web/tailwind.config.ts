import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f6f8fb",
          100: "#e7eff8",
          200: "#c9ddf4",
          300: "#9fcaec",
          400: "#6ab1e6",
          500: "#2d8ed6",
          600: "#1f6eac",
          700: "#165a87",
          800: "#0f4567",
          900: "#0a2f45",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

