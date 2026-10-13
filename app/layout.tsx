import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amanos",
  description: "Aprendé LESSA con la cámara validando cada seña.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2f7cf6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
