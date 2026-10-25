import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Nunito } from 'next/font/google';
import { Toaster } from 'sonner';
import { Header } from '@/components/app-shell/header';
import { InviteListener } from '@/components/app-shell/invite-listener';
import { OnlinePresenceProvider } from '@/components/app-shell/online-presence';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/supabase/server';
import { listFriends } from '@/server/social-service';
import './globals.css';

const display = Bricolage_Grotesque({ variable: '--font-bricolage', subsets: ['latin'], weight: ['600', '700', '800'] });
const body = Nunito({ variable: '--font-nunito', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Kniffel', template: '%s – Kniffel' },
  description: 'Kniffel online mit deinen Freunden spielen – live und kostenlos.',
};

export const viewport: Viewport = { themeColor: '#eef0ff', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();
  const friendIds = user ? (await listFriends(createAdminClient(), user.id)).friends.map((f) => f.profile.id) : [];
  const content = (
    <>
      <Header />
      {children}
    </>
  );
  return (
    <html lang="de" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {user ? (
          <OnlinePresenceProvider me={user.id} friendIds={friendIds}>
            {content}
            <InviteListener me={user.id} />
          </OnlinePresenceProvider>
        ) : content}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: { fontFamily: 'var(--font-nunito)', borderRadius: '1rem' },
            classNames: {
              actionButton: '!bg-sun !text-ink !font-bold !rounded-lg',
              cancelButton: '!bg-mist !text-ink-soft !font-bold !rounded-lg',
            },
          }}
        />
      </body>
    </html>
  );
}
