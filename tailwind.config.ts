import type { Config } from "tailwindcss";

// Tokens de diseño de Stitch ("Amanos LESSA", ver DESIGN.md) + los colores `brand` que usa /capture.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef7ff", 100: "#d9ecff", 500: "#2f7cf6", 600: "#1f64d6", 700: "#184fab" },
        ok: "#16a34a",
        warn: "#f59e0b",
        "on-error-container": "#93000a", "tertiary-container": "#945d00", "on-surface": "#131b2e", surface: "#faf8ff",
        "surface-container": "#eaedff", "on-error": "#ffffff", "on-secondary-fixed-variant": "#005320",
        "primary-fixed-dim": "#b0c6ff", outline: "#737785", secondary: "#006e2d", tertiary: "#734700",
        "on-primary-container": "#e3e9ff", "on-surface-variant": "#424653", "on-tertiary-container": "#ffe6cc",
        "on-secondary-container": "#007230", "inverse-primary": "#b0c6ff", "on-tertiary-fixed": "#2a1700",
        "surface-container-high": "#e2e7ff", "tertiary-fixed": "#ffddb8", "surface-dim": "#d2d9f4",
        "secondary-container": "#7cf994", background: "#faf8ff", "surface-tint": "#0358cb", "primary-fixed": "#d9e2ff",
        "primary-container": "#1f63d6", "secondary-fixed": "#7ffc97", "inverse-on-surface": "#eef0ff",
        "tertiary-fixed-dim": "#ffb95f", "surface-bright": "#faf8ff", "outline-variant": "#c2c6d6", error: "#ba1a1a",
        "secondary-fixed-dim": "#62df7d", "on-primary-fixed-variant": "#00419c", "surface-container-highest": "#dae2fd",
        "on-tertiary": "#ffffff", "error-container": "#ffdad6", "on-secondary-fixed": "#002109", "on-secondary": "#ffffff",
        "on-primary": "#ffffff", "surface-container-lowest": "#ffffff", primary: "#004bb0", "on-tertiary-fixed-variant": "#653e00",
        "surface-container-low": "#f2f3ff", "inverse-surface": "#283044", "surface-variant": "#dae2fd",
        "on-background": "#131b2e", "on-primary-fixed": "#001945",
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: {
        "space-xl": "2.5rem", "space-md": "1rem", "gutter-tablet": "1.5rem", "margin-tablet": "2rem",
        "gutter-desktop": "2rem", margin: "1rem", gutter: "1rem", "space-sm": "0.5rem", "margin-desktop": "3rem",
        "space-xs": "0.25rem", "space-lg": "1.5rem",
      },
      fontFamily: {
        "headline-sm": ["Plus Jakarta Sans Variable", "system-ui", "sans-serif"],
        "headline-xl": ["Plus Jakarta Sans Variable", "system-ui", "sans-serif"],
        "headline-xl-mobile": ["Plus Jakarta Sans Variable", "system-ui", "sans-serif"],
        "headline-lg": ["Plus Jakarta Sans Variable", "system-ui", "sans-serif"],
        "label-lg": ["Plus Jakarta Sans Variable", "system-ui", "sans-serif"],
        "label-md": ["Plus Jakarta Sans Variable", "system-ui", "sans-serif"],
        "label-sm": ["Plus Jakarta Sans Variable", "system-ui", "sans-serif"],
        "body-lg": ["Be Vietnam Pro", "system-ui", "sans-serif"],
        "body-md": ["Be Vietnam Pro", "system-ui", "sans-serif"],
        "body-sm": ["Be Vietnam Pro", "system-ui", "sans-serif"],
      },
      fontSize: {
        "headline-sm": ["20px", { lineHeight: "28px", fontWeight: "700" }],
        "headline-xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-xl-mobile": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "800" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-lg": ["16px", { lineHeight: "24px", letterSpacing: "0.01em", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-lg": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "700" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
};
export default config;
