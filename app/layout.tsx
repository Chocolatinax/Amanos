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

export const metadata: Metadata = {
  title: "Amanos · Aprendé LESSA",
  description: "Aprendé la Lengua de Señas Salvadoreña con lecciones en video y práctica con tu cámara.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: 'cover', themeColor: "#4372C9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh"><CatalogProvider><AppProvider>{children}</AppProvider></CatalogProvider></body>
    </html>
  );
}
