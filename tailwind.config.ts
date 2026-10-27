import type { Config } from "tailwindcss";

// Tokens de diseño de Stitch ("Amanos LESSA", ver DESIGN.md) + los colores `brand` que usa /capture.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta oficial Amanos: azul #4977CD (mano), coral #EF746D (mano), amarillo #FEDA84 (corazón).
        // Los tonos de texto están oscurecidos lo justo para pasar contraste WCAG AA (4.5:1).
        amanos: { blue: "#4977CD", coral: "#EF746D", yellow: "#FEDA84" },
        coral: { DEFAULT: "#EF746D", strong: "#C2453E", soft: "#FDE6E4", fixed: "#FBC9C5" },
        brand: { 50: "#F1F5FD", 100: "#E4ECFA", 500: "#4977CD", 600: "#4372C9", 700: "#3A65B8" },
        ok: "#1B8050",
        warn: "#E8A93A",

        // Azul de marca
        primary: "#3A65B8", "on-primary": "#ffffff",
        "primary-container": "#4372C9", "on-primary-container": "#ffffff",
        "primary-fixed": "#E4ECFA", "primary-fixed-dim": "#B9CCEF",
        "on-primary-fixed": "#0F2552", "on-primary-fixed-variant": "#2C5299",
        "inverse-primary": "#B9CCEF", "surface-tint": "#4977CD",

        // Verde de éxito (seña aceptada, checks, metas). Suavizado para combinar con la marca.
        secondary: "#1B8050", "on-secondary": "#ffffff",
        "secondary-container": "#D3F1DF", "on-secondary-container": "#0F5A39",
        "secondary-fixed": "#D3F1DF", "secondary-fixed-dim": "#7BD3A3",
        "on-secondary-fixed": "#002111", "on-secondary-fixed-variant": "#0F5A39",

        // Amarillo del corazón (rachas, logros). El texto usa ámbar oscuro para que se lea.
        tertiary: "#8A5A00", "on-tertiary": "#ffffff",
        "tertiary-container": "#B57A10", "on-tertiary-container": "#FFF4D6",
        "tertiary-fixed": "#FFF1C9", "tertiary-fixed-dim": "#FEDA84",
        "on-tertiary-fixed": "#2A1A00", "on-tertiary-fixed-variant": "#6B4700",

        // Superficies con un toque del azul de marca
        background: "#F7F9FE", "on-background": "#1C2333",
        surface: "#F7F9FE", "surface-bright": "#F7F9FE", "surface-dim": "#D5DEEF",
        "surface-container-lowest": "#ffffff", "surface-container-low": "#F1F5FD",
        "surface-container": "#E9EFFA", "surface-container-high": "#E1E9F7", "surface-container-highest": "#D8E2F4",
        "surface-variant": "#D8E2F4", "on-surface": "#1C2333", "on-surface-variant": "#4A5368",
        "inverse-surface": "#232B3D", "inverse-on-surface": "#EEF2FB",
        outline: "#737B8F", "outline-variant": "#C5CEDF",

        error: "#BA1A1A", "on-error": "#ffffff", "error-container": "#FFDAD6", "on-error-container": "#93000A",
      },
      borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
      spacing: {
        "space-xl": "2.5rem", "space-md": "1rem", "gutter-tablet": "1.5rem", "margin-tablet": "2rem",
        "gutter-desktop": "2rem", margin: "1rem", gutter: "1rem", "space-sm": "0.5rem", "margin-desktop": "3rem",
        "space-xs": "0.25rem", "space-lg": "1.5rem",
      },
      fontFamily: {
        // Wordmark "amanos": letra redondeada y gruesa como en el logo oficial.
        brand: ["Nunito Variable", "Nunito", "system-ui", "sans-serif"],
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
