import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import "tldraw/tldraw.css";
import { AutoAnonymousAuth } from "@/components/AutoAnonymousAuth";

// Baloo 2: rounded, playful display face for headings, the timer, room
// codes, and anything that should feel hand-drawn/marker-like.
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Nunito: rounded-terminal body sans that pairs with Baloo without clashing,
// and stays legible at small chat/UI sizes.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${baloo.variable} ${nunito.variable}`}>
      <body className="antialiased min-h-screen">
        <AutoAnonymousAuth />
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
