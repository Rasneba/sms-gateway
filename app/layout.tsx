import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Telebirr SMS SheetSync',
  description: 'Automatically capture Telebirr deposit SMS messages and sync transaction IDs and amounts into Google Sheets.',
  openGraph: {
    title: 'Telebirr SMS SheetSync',
    description: 'Automatically capture Telebirr deposit SMS messages and sync transaction IDs and amounts into Google Sheets.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Telebirr SMS SheetSync',
    description: 'Automatically capture Telebirr deposit SMS messages and sync transaction IDs and amounts into Google Sheets.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
