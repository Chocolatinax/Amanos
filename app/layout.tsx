import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/nunito";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/700.css";
import "material-symbols/outlined.css";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { CatalogProvider } from '@/lib/catalog';
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/lib/theme-script";
import { ThemeSync } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Amanos · Aprendé LESSA",
  description: "Aprendé la Lengua de Señas Salvadoreña con lecciones en video y práctica con tu cámara.",
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: 'cover',
  // Valor inicial según el sistema; el script de tema lo ajusta si se eligió un tema fijo.
  themeColor: [{ media: "(prefers-color-scheme: light)", color: THEME_COLORS.light }, { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // El script de tema agrega la clase `dark` antes de hidratar; por eso se ignora esa diferencia en <html>.
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /></head>
      <body className="min-h-dvh"><ThemeSync /><CatalogProvider><AppProvider>{children}</AppProvider></CatalogProvider></body>
    </html>
  );
}
