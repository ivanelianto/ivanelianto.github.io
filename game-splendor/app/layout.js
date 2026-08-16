import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Splendor by IV",
  description: "A local Splendor-style board game against a computer opponent."
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Mystery+Quest&family=Playpen+Sans&family=Kablammo&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
