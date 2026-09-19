import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Sans_Arabic,
  Inter,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";

import "./globals.css";

import { AppProvider } from "@/lib/app-context";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});
const ibmArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-ibm-arabic",
  weight: ["400", "500", "600"],
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://maw3idi.com"),
  title: {
    default: "MAW3IDI — L'assistant qui gère vos rendez-vous",
    template: "%s · MAW3IDI",
  },
  description:
    "MAW3IDI répond, confirme et planifie les rendez-vous de votre cabinet 24/7, en français et en darija — votre équipe garde la main sur chaque décision.",
  icons: {
    icon: "/logos/logo_maw3idi.png",
    apple: "/logos/logo_maw3idi.png",
  },
  openGraph: {
    title: "MAW3IDI — L'assistant qui gère vos rendez-vous",
    description:
      "Réponses automatiques WhatsApp, Instagram & appels téléphoniques pour votre cabinet médical.",
    images: ["/logos/logo_maw3idi.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F2A5C",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakarta.variable} ${ibmArabic.variable} ${jetbrains.variable} font-sans`}
      >
        <AppProvider>
          <ToastProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}