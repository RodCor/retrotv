import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Pixelify_Sans, Fredoka, Ubuntu } from "next/font/google";
import "./globals.css";
import { config } from "@/lib/config";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Public-site (2015 Habbo) fonts — friendly rounded display + Ubuntu body.
const habboDisplay = Fredoka({
  variable: "--font-habbo-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const habboBody = Ubuntu({
  variable: "--font-habbo-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: `${config.hotel.name} — Habbo Retro Hotel`,
  description: `Join ${config.hotel.name}, a modern Habbo-style virtual world. Create your avatar, design rooms, make friends and explore.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${pixel.variable} ${habboDisplay.variable} ${habboBody.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
