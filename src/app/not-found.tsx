import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="flex w-full max-w-sm flex-col items-start gap-4 p-7">
        <h1 className="text-3xl font-extrabold">Seite nicht gefunden</h1>
        <p className="text-ink-soft">Diese Adresse gibt es nicht. Vielleicht ein Tippfehler im Link?</p>
        <Link href="/" className={buttonClass('primary')}>Zur Startseite</Link>
      </Card>
    </main>
  );
}
