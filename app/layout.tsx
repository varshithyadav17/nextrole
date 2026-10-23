import type { Metadata } from "next";
import "./globals.css";
import "./focus.css";
import "./trail.css";
import "./scout-pages.css";
import {ScoutMotionProvider} from './scout-motion';

export const metadata: Metadata = {
  title: "NextRole — Your next opportunity",
  description: "A personal job radar for freshers. Discover live opportunities and keep every application in one place.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><ScoutMotionProvider>{children}</ScoutMotionProvider></body>
    </html>
  );
}
