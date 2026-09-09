import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roomly Hub",
  description: "Panel de gestión de Roomly",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
