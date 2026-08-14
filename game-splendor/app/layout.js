import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Offline Splendor Bot",
  description: "A local Splendor-style board game against a computer opponent."
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
