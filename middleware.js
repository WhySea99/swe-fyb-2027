import { NextResponse } from 'next/server';
import { isValidSession, SESSION_COOKIE_NAME } from './lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authed = await isValidSession(session);

  const protectedPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const protectedApi = ['/api/photos', '/api/delete', '/api/export'].some((p) =>
    pathname.startsWith(p)
  );

  if (protectedPage && !authed) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (protectedApi && !authed) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/photos/:path*', '/api/delete/:path*', '/api/export/:path*'],
};
