import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Grahan — a game of shadows and suns",
    template: "%s · Grahan",
  },
  description:
    "Grahan is a two-player strategy game. Slide stones along straight lines and diagonals, trap enemies between two of yours, and eclipse them.",
  keywords: ["strategy game", "abstract game", "board game", "grahan", "finite geometry"],
};

export const viewport: Viewport = {
  themeColor: "#15112e",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
