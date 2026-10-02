
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Merriweather, Montserrat } from "next/font/google";
import "./globals.css";
import "./landing.css";
import PageTransition from "@/components/PageTransition";
import ThemeConfig from "@/components/ThemeConfig";
import { Suspense } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  weight: ["300", "400", "700", "900"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gencar.my.id"),
  title: {
    template: "%s | Pashmina 8.0",
    default: "Pashmina 8.0 - Portal Ta'aruf & Usia Mandiri",
  },
  description: "Portal Ta'aruf & Usia Mandiri - Pashmina 8.0",
  openGraph: {
    title: "Pashmina 8.0 - Portal Ta'aruf & Usia Mandiri",
    description: "Portal Ta'aruf & Usia Mandiri - Pashmina 8.0",
    url: "https://gencar.my.id",
    siteName: "Pashmina 8.0",
    images: [
      {
        url: "https://gencar.my.id/img/pashmina-logo.png",
        width: 800,
        height: 600,
        alt: "Logo Pashmina 8.0",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pashmina 8.0 - Portal Ta'aruf & Usia Mandiri",
    description: "Portal Ta'aruf & Usia Mandiri - Pashmina 8.0",
    images: ["https://gencar.my.id/img/pashmina-logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable} ${merriweather.variable} ${montserrat.variable}`} suppressHydrationWarning>
        <Suspense fallback={null}>
          <ThemeConfig />
          <PageTransition />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
