import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


// 2. 对外用户端受保护路由 (校验 user_access_token)
const userProtectedPaths = [
  '/user/log',
  '/user/device',
  '/user/ai-record',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 获取管理员与用户端独立的 Cookie 令牌
  const adminAccessToken = request.cookies.get('access_token')?.value;
  const adminRefreshToken = request.cookies.get('refresh_token')?.value;

  const userAccessToken = request.cookies.get('user_access_token')?.value;
  const userRefreshToken = request.cookies.get('user_refresh_token')?.value;

  // -------------------------------------------------------------
  // 一、拦截管理员后台受保护路由 (排除登录页面本身)
  // -------------------------------------------------------------
  const isAdminProtected =
    (pathname === '/admin' || pathname.startsWith('/admin/')) &&
    pathname !== '/admin/login' &&
    pathname !== '/admin/forgot-password';

  if (isAdminProtected) {
    if (!adminAccessToken && !adminRefreshToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // -------------------------------------------------------------
  // 二、拦截对外用户端受保护路由
  // -------------------------------------------------------------
  const isUserProtected =
    pathname === '/user' ||
    userProtectedPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

  if (isUserProtected) {
    if (!userAccessToken && !userRefreshToken) {
      const userLoginUrl = new URL('/user/login', request.url);
      userLoginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(userLoginUrl);
    }
  }

  // -------------------------------------------------------------
  // 三、拦截认证路由防止重复登录
  // -------------------------------------------------------------
  // 管理员登录拦截
  if (pathname === '/admin/login' || pathname === '/register') {
    if (adminAccessToken) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // 普通用户登录拦截
  if (pathname === '/user/login') {
    if (userAccessToken) {
      return NextResponse.redirect(new URL('/user', request.url));
    }
  }

  // -------------------------------------------------------------
  // 四、根路径重定向
  // -------------------------------------------------------------
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

// 优化：配置匹配器以过滤不需要进行中间件拦截的静态资源路由
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，排除以下：
     * - api (API 路由)
     * - _next/static (静态资源)
     * - _next/image (图像优化文件)
     * - favicon.ico (浏览器图标)
     * - 各种图片、矢量图 (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webp).*)',
  ],
};
