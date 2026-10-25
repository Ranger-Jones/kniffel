import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { GATE_COOKIE, GATE_PATH, verifyGateToken } from '@/lib/gate';

const PUBLIC_PATHS = ['/', '/login', '/registrieren'];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Zuerst die Zugangsfrage: ohne gültiges Freischalt-Cookie ist nur /zugang erreichbar.
  const unlocked = await verifyGateToken(request.cookies.get(GATE_COOKIE)?.value, process.env.SUPABASE_SECRET_KEY);
  if (!unlocked && path !== GATE_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = GATE_PATH;
    url.search = path === '/' && !request.nextUrl.search ? '' : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (path === GATE_PATH) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !PUBLIC_PATHS.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}
