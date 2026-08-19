import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SplashScreen } from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "LETI",
  description:
    "LETI, logiciel pour piscinistes : simple et puissant.",
  icons: {
    icon: "/leti/favicon-32.png",
    apple: "/leti/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#F7F7F5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
