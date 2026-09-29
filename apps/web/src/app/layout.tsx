import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GRAHAN — Eclipse Strategy",
  description: "A mathematical strategy game played on affine planes over Galois Fields. Capture through geometric lines on a toroidal topology.",
  keywords: ["strategy game", "abstract game", "finite geometry", "Galois fields", "board game"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
