import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

// Tokens de diseño de Stitch ("Amanos LESSA", ver DESIGN.md). Cada token tiene valor claro y oscuro;
// se publican como variables CSS en :root y html.dark, así las clases (y sus /opacidades) cambian solas.
// Paleta oficial Amanos: azul #4977CD (mano), coral #EF746D (mano), amarillo #FEDA84 (corazón).
// Los tonos de texto se ajustaron para pasar contraste WCAG AA (4.5:1) en los dos temas.
const THEMED: Record<string, [light: string, dark: string]> = {
  // Azul de marca. El contenedor sostiene texto blanco en ambos temas; `primary` es el azul para texto.
  primary: ["#3A65B8", "#9DBBF2"], "on-primary": ["#FFFFFF", "#FFFFFF"],
  "primary-container": ["#4372C9", "#4372C9"], "on-primary-container": ["#FFFFFF", "#FFFFFF"],
  "primary-fixed": ["#E4ECFA", "#1F3156"], "primary-fixed-dim": ["#B9CCEF", "#2D4A82"],
  "on-primary-fixed": ["#0F2552", "#DCE6FA"], "on-primary-fixed-variant": ["#2C5299", "#B9CCEF"],
  "inverse-primary": ["#B9CCEF", "#3A65B8"], "surface-tint": ["#4977CD", "#9DBBF2"],

  // Verde de éxito (seña aceptada, checks, metas). En oscuro el verde se aclara y el texto encima pasa a oscuro.
  secondary: ["#1B8050", "#45B97F"], "on-secondary": ["#FFFFFF", "#04170D"],
  "secondary-container": ["#D3F1DF", "#133C29"], "on-secondary-container": ["#0F5A39", "#A6E8C4"],
  "secondary-fixed": ["#D3F1DF", "#133C29"], "secondary-fixed-dim": ["#7BD3A3", "#45B97F"],
  "on-secondary-fixed": ["#002111", "#D3F1DF"], "on-secondary-fixed-variant": ["#0F5A39", "#A6E8C4"],

  // Amarillo del corazón (rachas, logros).
  tertiary: ["#8A5A00", "#F2C35B"], "on-tertiary": ["#FFFFFF", "#2A1A00"],
  "tertiary-container": ["#B57A10", "#B57A10"], "on-tertiary-container": ["#FFF4D6", "#FFF4D6"],
  "tertiary-fixed": ["#FFF1C9", "#3B2B06"], "tertiary-fixed-dim": ["#FEDA84", "#FEDA84"],
  "on-tertiary-fixed": ["#2A1A00", "#FFE9B0"], "on-tertiary-fixed-variant": ["#6B4700", "#F2C35B"],

  // Superficies con un toque del azul de marca. En oscuro las tarjetas quedan un poco más claras que el fondo.
  background: ["#F7F9FE", "#0E131E"], "on-background": ["#1C2333", "#E3E8F4"],
  surface: ["#F7F9FE", "#0E131E"], "surface-bright": ["#F7F9FE", "#2A3245"], "surface-dim": ["#D5DEEF", "#0E131E"],
  "surface-container-lowest": ["#FFFFFF", "#1A2131"], "surface-container-low": ["#F1F5FD", "#151B28"],
  "surface-container": ["#E9EFFA", "#1F2737"], "surface-container-high": ["#E1E9F7", "#273043"], "surface-container-highest": ["#D8E2F4", "#2F394E"],
  "surface-variant": ["#D8E2F4", "#2F394E"], "on-surface": ["#1C2333", "#E3E8F4"], "on-surface-variant": ["#4A5368", "#AEB7CB"],
  // Se usa como fondo de la cámara y velos: queda oscuro en los dos temas.
  "inverse-surface": ["#232B3D", "#05080F"], "inverse-on-surface": ["#EEF2FB", "#EEF2FB"],
  outline: ["#737B8F", "#8892A8"], "outline-variant": ["#C5CEDF", "#3A4459"],

  error: ["#BA1A1A", "#FFB4AB"], "on-error": ["#FFFFFF", "#690005"], "error-container": ["#FFDAD6", "#5C1414"], "on-error-container": ["#93000A", "#FFDAD6"],

  "coral-strong": ["#C2453E", "#F59C96"], "coral-soft": ["#FDE6E4", "#3A1E1C"], "coral-fixed": ["#FBC9C5", "#5A2A27"],
};
const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const vars = (i: 0 | 1) => Object.fromEntries(Object.entries(THEMED).map(([k, v]) => [`--c-${k}`, channels(v[i])]));
const themed = Object.fromEntries(Object.keys(THEMED).map(k => [k, `rgb(var(--c-${k}) / <alpha-value>)`]));

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...themed,
        amanos: { blue: "#4977CD", coral: "#EF746D", yellow: "#FEDA84" },
        coral: { DEFAULT: "#EF746D", strong: themed["coral-strong"], soft: themed["coral-soft"], fixed: themed["coral-fixed"] },
        // Colores `brand` que usa /capture.
        brand: { 50: "#F1F5FD", 100: "#E4ECFA", 500: "#4977CD", 600: "#4372C9", 700: "#3A65B8" },
        ok: "#1B8050",
        warn: "#E8A93A",
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
  plugins: [plugin(({ addBase }) => addBase({ ":root": vars(0), "html.dark": vars(1) }))],
};
export default config;
