import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SplashScreen } from "@/components/SplashScreen";

export const metadata: Metadata = {
  metadataBase: new URL("https://leti-app-reunion.vercel.app"),
  title: "LETI",
  applicationName: "LETI",
  description:
    "LETI, logiciel pour piscinistes : simple et puissant.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/leti/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/leti/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    shortcut: "/leti/favicon-64.png",
    apple: [
      {
        url: "/leti/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "LETI",
    statusBarStyle: "default",
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
