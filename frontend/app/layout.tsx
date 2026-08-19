import type { ReactNode } from "react";

import "./globals.css";

export const metadata = { title: "Panel de Administración Cargable" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-onSurface antialiased">{children}</body>
    </html>
  );
}
