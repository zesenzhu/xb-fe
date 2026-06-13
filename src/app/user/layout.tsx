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
  Clock,
  LogOut,
  Sun,
  Moon,
  User as UserIcon,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { api } from '@/lib/axios';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

const userNavItems: NavItem[] = [
  { name: '实时运行日志', path: '/user/log', icon: FileCode2 },
  { name: '我的物理设备', path: '/user/device', icon: Cpu },
];

export default function UserPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useGlobalStore();
  const {
    user,
    clearAuth,
    isAuthenticated,
    sseConnected,
    setSseConnected,
    handleDeviceEvent,
    emitLog,
    setDevicesList,
    updateUser,
  } = useUserStore();

  const [mounted, setMounted] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  // 格式化渲染剩余时间
  const renderRemainingTime = (expireTime?: string) => {
    if (!expireTime) return '计算中...';
    const expire = new Date(expireTime);
    const now = new Date();
    const diffMs = expire.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return '已到期';
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}天${diffHours}小时`;
    }
    if (diffHours > 0) {
      return `${diffHours}小时${diffMinutes}分钟`;
    }
    return `${diffMinutes}分钟`;
  };

  // 增加实时时钟逻辑
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. 挂载时拉取初始基线设备列表，并开启全局多路混合 SSE 长连接
  useEffect(() => {
    setMounted(true);
    
    if (!isAuthenticated || !user?.username) {
      if (isAuthenticated) {
        router.push('/user/login');
      }
      return;
    }

    let eventSource: EventSource | null = null;
    let statusInterval: any = null;

    const initConnection = async () => {
      // A. 先拉取一次初始物理设备列表基线，灌入 Zustand
      try {
        const response: any = await api.get('/register-codes/my-devices', {
          params: { code: user.username },
        });
        setDevicesList(response || []);
      } catch (err) {
        console.error('[SSE Baseline] 获取设备基线列表失败:', err);
      }

      // B. 建立全局 SSE 通道
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';
      const sseUrl = `${apiUrl}/logs/user-stream?code=${user.username}`;
      
      console.log('[SSE] 正在建立全局统一长连接流:', sseUrl);
      eventSource = new EventSource(sseUrl, { withCredentials: true });

      eventSource.onopen = () => {
        console.log('[SSE] 🤝 全局物理信道连接成功，通信链路恢复。');
        setSseConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;

          if (type === 'heartbeat') {
            // 定时保活数据包，亮起绿灯
            setSseConnected(true);
          } else if (type === 'device_list' || type === 'device_status') {
            // 实时增量更新设备列表与电量状态
            handleDeviceEvent(type, payload);
          } else if (type === 'log') {
            // 实时分发广播日志消息
            emitLog(payload);
          }
        } catch (e) {
          console.error('[SSE] 解析流载荷包失败:', e);
        }
      };

      eventSource.onerror = () => {
        console.warn('[SSE] ⚠️ 全局长连接流断开连接，正在重连...');
        setSseConnected(false);
      };
    };

    const fetchStatus = async () => {
      try {
        const response: any = await api.get('/register-codes/my-status', {
          params: { code: user.username },
        });
        if (response && response.expireTime) {
          updateUser({ expireTime: response.expireTime });
        }
      } catch (err) {
        console.error('[Status Poll] 轮询激活码状态失败:', err);
      }
    };

    initConnection();
    fetchStatus();
    statusInterval = setInterval(fetchStatus, 15000);

    return () => {
      if (eventSource) {
        console.log('[SSE] 🔌 主动关闭全局长连接流。');
        eventSource.close();
      }
      setSseConnected(false);
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [
    isAuthenticated,
    user?.username,
    router,
    setSseConnected,
    handleDeviceEvent,
    emitLog,
    setDevicesList,
    updateUser,
  ]);

  if (!mounted) {
    return <div className="h-screen w-screen bg-slate-950" />;
  }

  // 排除登录页面自身的 Layout 嵌套渲染，登录页应当采用纯色背景不显示导航栏
  if (pathname === '/user/login') {
    return <>{children}</>;
  }

  // 用户端登出逻辑
  const handleLogout = async () => {
    try {
      await api.post('/auth/user/logout');
    } catch (err) {
      console.error('退出登录调用接口失败:', err);
    }
    Cookies.remove('user_access_token');
    Cookies.remove('user_refresh_token');
    disconnectSocket(); // 主动断开 WebSockets 长链接
    clearAuth();
    toast.success('您已成功安全退出控制终端');
    // 强力使用 window.location.href 进行整页重载跳转，彻底清理 React 内存状态并绕过 Next.js 路由缓存
    window.location.href = '/user/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* 顶部现代 SaaS 悬浮玻璃导航栏 */}
      <header className="h-16 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between select-none">
        
        {/* LOGO 与长连接状态呼吸灯 */}
        <div className="flex items-center gap-6">
          <Link href="/user/log" className="flex items-center gap-2 font-bold tracking-widest text-slate-900 dark:text-white">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-4 h-4 text-white dark:text-zinc-950 shrink-0" />
            </div>
            <span className="text-sm font-black whitespace-nowrap bg-gradient-to-r from-slate-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
              小宝修仙
            </span>
          </Link>
          
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

          {/* WebSocket 长连接物理状态呼吸灯 */}
          <div className={cn(
            "hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all duration-300",
            sseConnected
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 animate-pulse'
          )}>
            {sseConnected ? (
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
                    ? "bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm border border-slate-300/50 dark:border-zinc-700/50"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900"
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
          {/* 实时时间 (大屏显示，小屏自动隐藏，考虑分辨率布局) */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-500 dark:text-zinc-400 select-none">
            <Clock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <span>{timeStr || '载入中...'}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800/40 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
          >
            {theme === 'dark' ? (
              <Sun className="w-4.5 h-4.5 text-amber-500 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-slate-550" />
            )}
          </Button>

          <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800" />

          {/* 用户资料简要展示 */}
          <div className="hidden sm:flex items-center gap-2 pl-1 select-text">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-white flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200 dark:border-zinc-800">
              {user?.username?.charAt(0).toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
            </div>
            <div className="flex flex-col text-left shrink-0">
              <span className="text-xs font-extrabold leading-none text-slate-900 dark:text-white">{user?.nickname || user?.username || '终端用户'}</span>
              <span className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 font-mono tracking-wider">
                剩余时长: {renderRemainingTime(user?.expireTime)} \| ID: {user?.id?.slice(0, 8)}
              </span>
            </div>
          </div>

          {/* 极简退出按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 border border-transparent hover:border-red-100 dark:hover:border-red-950/40"
          >
            <LogOut className="w-4.5 h-4.5" />
          </Button>
        </div>
      </header>

      {/* 移动端横向浮动导航栏 (隐藏在桌面端) */}
      <nav className="md:hidden h-12 bg-white/90 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800/60 px-4 flex items-center justify-around select-none shrink-0 sticky top-16 z-40 backdrop-blur">
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
                  ? "bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-300 dark:border-zinc-700/50"
                  : "text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white"
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
