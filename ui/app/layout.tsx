import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

import { site } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tankful: a token fuel tank for eve agents",
    template: "%s | Tankful",
  },
  description: site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (() => {
            const media = matchMedia('(prefers-color-scheme: dark)');
            const apply = () => {
              let saved;
              try { saved = localStorage.getItem('tankful-theme'); } catch {}
              document.documentElement.dataset.theme = saved === 'dark' || saved === 'light'
                ? saved : media.matches ? 'dark' : 'light';
            };
            apply();
            media.addEventListener('change', apply);
            window.addEventListener('storage', e => { if (!e.key || e.key === 'tankful-theme') apply(); });
          })();
        ` }} />
      </head>
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
