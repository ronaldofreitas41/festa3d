import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const sans = Manrope({ variable: "--font-sans", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Festa 3D — planeje a decoração do evento em 3D",
  description:
    "Fotografe seu acervo de decoração, transforme cada peça em 3D e monte o evento inteiro no local antes do grande dia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
