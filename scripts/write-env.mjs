import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const status = JSON.parse(execSync('pnpm exec supabase status -o json', { encoding: 'utf8' }));
const publishable = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const secret = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
if (!status.API_URL || !publishable || !secret) {
  console.error('Supabase läuft nicht? `pnpm db:start` ausführen.', Object.keys(status));
  process.exit(1);
}
writeFileSync(
  '.env.local',
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}\nSUPABASE_SECRET_KEY=${secret}\n`,
);
console.log('.env.local geschrieben');
