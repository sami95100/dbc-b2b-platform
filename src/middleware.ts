import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Pages qui ne nécessitent pas d'authentification  
  const publicPages = ['/login', '/signup'];
  const isPublicPage = publicPages.some(page => req.nextUrl.pathname.startsWith(page));

  // Pour l'instant, on laisse le contrôle d'accès au niveau des composants
  // Le middleware sera amélioré quand nous aurons configuré les helpers Supabase
  
  // Redirection simple pour la page d'accueil
  if (req.nextUrl.pathname === '/') {
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 