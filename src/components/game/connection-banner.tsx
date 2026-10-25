export function ConnectionBanner({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 bg-sun px-4 py-2 text-center text-sm font-bold text-ink">
      Verbindung wird wiederhergestellt …
    </div>
  );
}
