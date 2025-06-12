import { NextRequest, NextResponse } from 'next/server';
import { i18nRouter } from 'next-i18n-router';
import { apiURL } from '@common/utils/api-url';
import i18nConfig from './app/i18nConfig';
import { protectedRoutes } from '@common/utils/protected-routes';

export async function middleware(req: NextRequest) {
  const {
    nextUrl: { pathname, origin },
  } = req;

  if (protectedRoutes.includes(pathname)) {
    const cookiName = 'connect.sid';
    const token = req.cookies.get(cookiName)?.value || '';

    const { status } = await fetch(apiURL('/me'), {
      cache: 'no-cache',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Cookie: `${cookiName}=${encodeURI(token)}`,
      },
    });

    if (status === 401) {
      const absoluteUrl = new URL(`${process.env.BASE_PATH}/login?path=${pathname}`, origin);
      return NextResponse.redirect(absoluteUrl.toString());
    }
  }

  req.headers.set('x-path', pathname);
  return i18nRouter(req, i18nConfig);
}

export const config = {
  matcher: '/((?!api|static|.*\\..*|_next).*)',
};
