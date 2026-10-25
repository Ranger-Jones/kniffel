import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function JoinError({ message }: { message: string }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="flex w-full max-w-sm flex-col items-start gap-4 p-7">
        <h1 className="text-3xl font-extrabold">Beitreten geht gerade nicht</h1>
        <p className="text-ink-soft">{message}</p>
        <Link href="/" className={buttonClass('primary')}>Zur Startseite</Link>
      </Card>
    </main>
  );
}
