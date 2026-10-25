import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Nunito } from 'next/font/google';
import { Toaster } from 'sonner';
import { Header } from '@/components/app-shell/header';
import './globals.css';

const display = Bricolage_Grotesque({ variable: '--font-bricolage', subsets: ['latin'], weight: ['600', '700', '800'] });
const body = Nunito({ variable: '--font-nunito', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Kniffel', template: '%s – Kniffel' },
  description: 'Kniffel online mit deinen Freunden spielen – live und kostenlos.',
};

export const viewport: Viewport = { themeColor: '#eef0ff', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="de" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Header />
        {children}
        <Toaster position="top-center" richColors toastOptions={{ style: { fontFamily: 'var(--font-nunito)', borderRadius: '1rem' } }} />
      </body>
    </html>
  );
}
