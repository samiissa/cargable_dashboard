import type { ReactNode } from "react";

import "./globals.css";

export const metadata = { title: "Cargable Admin Dashboard" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-onSurface antialiased">{children}</body>
    </html>
  );
}
