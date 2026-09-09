import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Roomly Hub",
  description: "Gestión de habitaciones y propiedades para agencias.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="bg-gray-50">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
