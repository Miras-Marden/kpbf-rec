import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KPBF REC",
  description: "Kazakhstani boxing database"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

