'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useGlobalStore } from '@/store/useGlobalStore';
import { useUserStore } from '@/store/useUserStore';
import { cn, getFileUrl } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  KeyRound,
  FileCode2,
  Cpu,
  Bot,
  Menu,
  ChevronLeft,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Bell,
  ChevronRight,
  Terminal,
  Clock,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { api } from '@/lib/axios';
import HeaderNotification from './_components/HeaderNotification';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  permission?: string;
}

const menuItems: MenuItem[] = [
  { name: '系统仪表盘', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: '用户管理', path: '/admin/user', icon: Users, permission: 'user:list' },
  { name: '角色权限', path: '/admin/role', icon: ShieldAlert, permission: 'role:list' },
  { name: '激活码管理', path: '/admin/code', icon: KeyRound, permission: 'code:list' },
  { name: '脚本运行日志', path: '/admin/log', icon: FileCode2, permission: 'log:list' },
  { name: 'MQTT设备监控', path: '/admin/device', icon: Cpu, permission: 'device:list' },
  { name: '长连接模拟器', path: '/admin/device/test-simulator', icon: Terminal, permission: 'device:list' },
  { name: '接口调试沙箱', path: '/admin/api-test', icon: Terminal, permission: 'admin:only' },
  { name: 'AI Agent控制台', path: '/admin/ai', icon: Bot, permission: 'ai:list' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useGlobalStore();
  const { user, permissions, clearAuth, isAuthenticated } = useUserStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      const seconds = pad(d.getSeconds());
      setCurrentTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 保证客户端完全挂载后再处理状态，防止 Hydration Error
  useEffect(() => {
    setMounted(true);
    // 如果客户端显示未登录，直接跳登录页 (双重安全拦截)
    if (!isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, router]);

  if (!mounted) {
    return <div className="h-screen w-screen bg-background" />;
  }

  // 退出登录逻辑
  const handleLogout = async () => {
    try {
      // 1. 物理调用后端登出接口清除 httpOnly Cookies 凭证
      await api.post('/auth/admin/logout');
    } catch (e) {
      console.warn('调用后端退出登录接口失败，降级进行本地清理', e);
    } finally {
      // 2. 强制清除本地状态和 Cookie
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      clearAuth();
      toast.success('退出登录成功');
      // 3. 强力使用 window.location.href 进行整页重载跳转，彻底清理 React 内存状态并绕过 Next.js 路由缓存
      window.location.href = '/admin/login';
    }
  };

  // 根据当前路径与权限过滤菜单
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.permission === 'admin:only') {
      return user?.role?.code === 'admin';
    }
    if (!item.permission) return true;
    return (
      permissions.includes('*') ||
      permissions.includes(item.permission)
    );
  });

  // 根据当前 URL 生成多级面包屑数据
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: '首页', path: '/admin/dashboard' }];
    
    let currentPath = '';
    paths.forEach((p) => {
      currentPath += `/${p}`;
      const matchingMenu = menuItems.find((item) => item.path === currentPath);
      if (matchingMenu) {
        breadcrumbs.push({ name: matchingMenu.name, path: matchingMenu.path });
      }
    });

    // 兜底路径名映射
    if (breadcrumbs.length === 1 && pathname !== '/admin/dashboard') {
      if (pathname === '/admin/profile') {
        breadcrumbs.push({ name: '个人中心', path: '/admin/profile' });
      } else if (pathname === '/admin/settings') {
        breadcrumbs.push({ name: '系统设置', path: '/admin/settings' });
      } else {
        // 其他未知页面
        const lastPart = paths[paths.length - 1];
        if (lastPart) {
          breadcrumbs.push({ name: lastPart.toUpperCase(), path: pathname });
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // 动态计算是否显示左侧 Sidebar 侧边栏菜单
  const showSidebar = menuItems.some(
    (item) => pathname === item.path || pathname.startsWith(item.path + '/')
  );

  // 辅助函数：判断菜单项是否处于选中态 (避免父子路径选中冲突)
  const isMenuSelected = (itemPath: string) => {
    if (pathname === itemPath) return true;
    if (pathname.startsWith(`${itemPath}/`)) {
      // 检查是否有更长且能匹配的其它菜单项
      const hasBetterMatch = menuItems.some(
        (other) => other.path !== itemPath && pathname.startsWith(other.path) && other.path.length > itemPath.length
      );
      return !hasBetterMatch;
    }
    return false;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 text-foreground transition-colors duration-300">

      {/* 1. 桌面端左侧边栏 */}
      {showSidebar && (
        <aside
          className={cn(
            "hidden md:flex flex-col bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 transition-all duration-300 ease-in-out select-none",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
        {/* LOGO 区域 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-zinc-800/50">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold tracking-wider overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center shrink-0">
              <span className="text-white dark:text-black font-extrabold text-sm">宝</span>
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent font-black whitespace-nowrap animate-in fade-in duration-300">
                小宝修仙
              </span>
            )}
          </Link>
        </div>

        {/* 导航菜单区域 */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isMenuSelected(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-foreground"
                )}
              >
                <Icon className={cn("w-[18px] h-[18px] shrink-0", isActive ? "" : "text-slate-500 dark:text-zinc-400 group-hover:text-foreground")} />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                
                {/* 折叠模式下的 Hover Tooltip */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 text-white text-xs invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 shadow-md">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 侧边栏底部折叠折点 */}
        <div className="p-3 border-t border-slate-100 dark:border-zinc-800/50 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-8 h-8 hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", sidebarCollapsed && "rotate-180")} />
          </Button>
        </div>
      </aside>
      )}

      {/* 移动端侧边抽屉 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="w-64 h-full bg-white dark:bg-zinc-900 flex flex-col p-4 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-16 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/50 mb-4">
              <span className="font-extrabold text-lg">小宝修仙</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = isMenuSelected(item.path);

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950"
                        : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* 2. 主页面渲染区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 顶部通栏 Navbar */}
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 sticky top-0 z-40 select-none flex items-center justify-center w-full">
          <div className={cn(
            "flex items-center justify-between w-full h-full px-4",
            !showSidebar && "max-w-6xl mx-auto px-6 md:px-8"
          )}>
            <div className="flex items-center gap-4">
              {/* 移动端菜单激活按钮 - 始终保留以允许在任何页面拉出主干菜单 */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* 动态面包屑导航 (隐藏在极小屏幕下) */}
              <nav className="hidden sm:flex items-center gap-1 text-sm text-slate-500 dark:text-zinc-400">
              {breadcrumbs.map((crumb, idx) => (
                <div key={`${crumb.path}-${idx}`} className="flex items-center">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1 text-slate-400" />}
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{crumb.name}</span>
                  ) : (
                    <Link href={crumb.path} className="hover:text-slate-800 dark:hover:text-zinc-200 transition-colors">
                      {crumb.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* 右侧系统配置与用户下拉菜单 */}
          <div className="flex items-center gap-3">
            {/* 消息通知 (动态业务提醒) */}
            <HeaderNotification />

            {/* 实时时间显示 */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-800 text-xs font-mono font-bold text-slate-600 dark:text-zinc-400 select-none">
              <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>{currentTime}</span>
            </div>

            {/* 暗黑/明亮模式极光微动切换 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-amber-500 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-slate-700 transition-transform hover:-rotate-12" />
              )}
            </Button>

            <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800" />

            {/* 用户下拉悬浮菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 pl-2 focus:outline-none hover:opacity-85 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-300 dark:border-zinc-700 overflow-hidden">
                  {user?.avatar ? (
                    <img src={getFileUrl(user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.username?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden lg:flex flex-col items-start text-left shrink-0">
                  <span className="text-sm font-semibold leading-none">{user?.nickname || user?.username || '管理员'}</span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 uppercase font-semibold">
                    {user?.role?.name || '无角色'}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 dark:bg-zinc-900 dark:border-zinc-800">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email || '未绑定邮箱'}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="dark:bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => router.push('/admin/profile')}
                  className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 gap-2"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>个人中心</span>
                </DropdownMenuItem>
                {user?.role?.code === 'admin' && (
                  <>
                    <DropdownMenuSeparator className="dark:bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={() => router.push('/admin/settings')}
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 gap-2"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      <span>系统设置</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="dark:bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/20 gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        </header>

        {/* 3. 子页面渲染主体 */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className={cn(
            "w-full animate-in fade-in duration-300",
            !showSidebar && "max-w-6xl mx-auto px-2 md:px-4"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
