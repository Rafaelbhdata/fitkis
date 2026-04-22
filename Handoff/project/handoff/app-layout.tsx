import { Fraunces, Geist, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--f-serif',
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--f-sans',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const jbm = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--f-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata = {
  title: 'Fitkis',
  description: 'Un pulso para tu vida diaria.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${geist.variable} ${jbm.variable}`}>
      <body>{children}</body>
    </html>
  );
}
