'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useGlobalStore } from '@/store/useGlobalStore';
import { useUserStore } from '@/store/useUserStore';
import { cn } from '@/lib/utils';
import {
  FileCode2,
  Cpu,
  History,
  LogOut,
  Sun,
  Moon,
  User as UserIcon,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';
import Cookies from 'js-cookie';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

const userNavItems: NavItem[] = [
  { name: '实时运行日志', path: '/user/log', icon: FileCode2 },
  { name: '我的物理设备', path: '/user/device', icon: Cpu },
  { name: 'AI 任务记录', path: '/user/ai-record', icon: History },
];

export default function UserPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useGlobalStore();
  const { user, clearAuth, isAuthenticated } = useUserStore();

  const [mounted, setMounted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // 1. 双重安全网校验，并初始化 Socket 长连接通信
  useEffect(() => {
    setMounted(true);

    const clientAccessToken = Cookies.get('user_access_token');
    
    // 如果无 Cookie 或 Zustand 标识未登录，强制退回用户登录端 (Middleware 是第一关，这里是浏览器端第二关)
    if (!clientAccessToken || !isAuthenticated) {
      router.push('/user/login');
      return;
    }

    // 初始化全局长链接握手
    const socket = getSocket();
    if (socket && typeof socket.connect === 'function') {
      socket.connect(); // 手动发起 TCP 握手
      
      const onConnect = () => setSocketConnected(true);
      const onDisconnect = () => setSocketConnected(false);

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      // 如果当前已经是连接状态
      if (socket.connected) {
        setSocketConnected(true);
      }

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    }
  }, [isAuthenticated, router]);

  if (!mounted) {
    return <div className="h-screen w-screen bg-slate-950" />;
  }

  // 排除登录页面自身的 Layout 嵌套渲染，登录页应当采用纯色背景不显示导航栏
  if (pathname === '/user/login') {
    return <>{children}</>;
  }

  // 用户端登出逻辑
  const handleLogout = () => {
    Cookies.remove('user_access_token');
    Cookies.remove('user_refresh_token');
    disconnectSocket(); // 主动断开 WebSockets 长链接
    clearAuth();
    toast.success('您已成功安全退出控制终端');
    router.push('/user/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* 顶部现代 SaaS 悬浮玻璃导航栏 */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between select-none">
        
        {/* LOGO 与长连接状态呼吸灯 */}
        <div className="flex items-center gap-6">
          <Link href="/user/log" className="flex items-center gap-2 font-bold tracking-widest text-white">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-4 h-4 text-zinc-950 shrink-0" />
            </div>
            <span className="text-sm font-black whitespace-nowrap bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              XBNETS PORTAL
            </span>
          </Link>
          
          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* WebSocket 长连接物理状态呼吸灯 */}
          <div className={cn(
            "hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all duration-300",
            socketConnected
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
              : 'bg-red-950/20 border-red-500/30 text-red-400 animate-pulse'
          )}>
            {socketConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                通信链路：正常
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                通信链路：离线重连中
              </>
            )}
          </div>
        </div>

        {/* 顶部扁平化菜单 (桌面端) */}
        <nav className="hidden md:flex items-center gap-1.5">
          {userNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200",
                  isActive
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/50"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* 右侧设置、主题与用户退出 */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl hover:bg-zinc-900 border border-zinc-800/40 text-zinc-400 hover:text-white"
          >
            {theme === 'dark' ? (
              <Sun className="w-4.5 h-4.5 text-amber-500 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-slate-300" />
            )}
          </Button>

          <div className="h-5 w-px bg-zinc-800" />

          {/* 用户资料简要展示 */}
          <div className="hidden sm:flex items-center gap-2 pl-1 select-text">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-zinc-800">
              {user?.username?.charAt(0).toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
            </div>
            <div className="flex flex-col text-left shrink-0">
              <span className="text-xs font-extrabold leading-none text-white">{user?.nickname || user?.username || '终端用户'}</span>
              <span className="text-[9px] text-zinc-500 mt-1 font-mono tracking-wider">
                ID: {user?.id?.slice(0, 8)}
              </span>
            </div>
          </div>

          {/* 极简退出按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl hover:bg-red-950/20 text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-950/40"
          >
            <LogOut className="w-4.5 h-4.5" />
          </Button>
        </div>
      </header>

      {/* 移动端横向浮动导航栏 (隐藏在桌面端) */}
      <nav className="md:hidden h-12 bg-zinc-900/90 border-b border-zinc-800/60 px-4 flex items-center justify-around select-none shrink-0 sticky top-16 z-40 backdrop-blur">
        {userNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider transition-colors",
                isActive
                  ? "bg-zinc-800 text-white border border-zinc-700/50"
                  : "text-zinc-500 hover:text-white"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* 核心页面渲染区域 */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl w-full mx-auto animate-in fade-in duration-300">
        {children}
      </main>
    </div>
  );
}
