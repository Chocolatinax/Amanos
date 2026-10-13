import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef7ff", 100: "#d9ecff", 500: "#2f7cf6", 600: "#1f64d6", 700: "#184fab" },
        ok: "#16a34a",
        warn: "#f59e0b",
      },
    },
  },
  plugins: [],
};
export default config;
