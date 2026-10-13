import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trackerz — Production Tracker',
  description: 'Jewelry order manufacturing tracking with Shopify integration',
  icons: {
    icon: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M4 9L8 3H16L20 9L12 21L4 9Z%27 fill=%27black%27/%3E%3Cpath d=%27M4 9H20%27 stroke=%27white%27/%3E%3Cpath d=%27M8 3L12 9L16 3%27 stroke=%27white%27/%3E%3Cpath d=%27M4 9L12 21L20 9%27 stroke=%27white%27/%3E%3C/svg%3E',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
