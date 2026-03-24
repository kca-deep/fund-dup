import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavHeader } from "@/components/nav-header";
import { ScrollRevealProvider } from "@/components/scroll-reveal-provider";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ICT기금 중복수급 · AI기반 유사도검증",
  description: "사업계획서 유사도 검사 시스템",
};

// Inline script to prevent flash of wrong theme (FOUC)
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var d = (!t || t === 'system')
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : t === 'dark';
    var el = document.documentElement;
    if (d) { el.classList.add('dark'); el.setAttribute('data-theme','dark'); }
    else { el.classList.remove('dark'); el.setAttribute('data-theme','light'); }
  } catch(e) {}
})()
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {/* Supanova: Ambient mesh gradient background */}
          <div className="mesh-gradient" aria-hidden="true" />

          {/* Supanova: Noise texture overlay */}
          <div className="noise-overlay" aria-hidden="true" />

          {/* App shell */}
          <div className="relative z-10 min-h-[100dvh]">
            <NavHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
              <ScrollRevealProvider>
                {children}
              </ScrollRevealProvider>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
