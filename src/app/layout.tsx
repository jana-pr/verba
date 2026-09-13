import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VERBA — Words that work.',
  description: 'Understand it. Recall it. Use it. Osobní aplikace pro cílené studium odborného jazyka.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs" className="h-full bg-verba-canvas">
      <body className="h-full antialiased font-sans">{children}</body>
    </html>
  );
}
