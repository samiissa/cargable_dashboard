import type { ReactNode } from "react";

export const metadata = { title: "Cargable Admin Dashboard" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
