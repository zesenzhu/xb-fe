'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useGlobalStore } from '@/store/useGlobalStore';
import { useUserStore } from '@/store/useUserStore';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  permission?: string;
}

const menuItems: MenuItem[] = [
  { name: '系统仪表盘', path: '/dashboard', icon: LayoutDashboard },
  { name: '用户管理', path: '/user', icon: Users, permission: 'user:list' },
  { name: '角色权限', path: '/role', icon: ShieldAlert, permission: 'role:list' },
  { name: '注册激活码', path: '/code', icon: KeyRound, permission: 'code:list' },
  { name: '脚本运行日志', path: '/log', icon: FileCode2, permission: 'log:list' },
  { name: 'MQTT设备监控', path: '/device', icon: Cpu, permission: 'device:list' },
  { name: 'AI Agent控制台', path: '/ai', icon: Bot, permission: 'ai:list' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useGlobalStore();
  const { user, permissions, clearAuth, isAuthenticated } = useUserStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 保证客户端完全挂载后再处理状态，防止 Hydration Error
  useEffect(() => {
    setMounted(true);
    // 如果客户端显示未登录，直接跳登录页 (双重安全拦截)
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!mounted) {
    return <div className="h-screen w-screen bg-background" />;
  }

  // 退出登录逻辑
  const handleLogout = () => {
    clearAuth();
    toast.success('退出登录成功');
    router.push('/login');
  };

  // 根据当前路径与权限过滤菜单
  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true;
    return (
      permissions.includes('*') ||
      permissions.includes(item.permission)
    );
  });

  // 根据当前 URL 生成多级面包屑数据
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: '首页', path: '/dashboard' }];
    
    let currentPath = '';
    paths.forEach((p) => {
      currentPath += `/${p}`;
      const matchingMenu = menuItems.find((item) => item.path === currentPath);
      if (matchingMenu) {
        breadcrumbs.push({ name: matchingMenu.name, path: matchingMenu.path });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-foreground transition-colors duration-300">
      
      {/* 1. 桌面端左侧边栏 */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 transition-all duration-300 ease-in-out select-none",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* LOGO 区域 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-zinc-800/50">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-wider overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center shrink-0">
              <span className="text-white dark:text-black font-extrabold text-sm">XB</span>
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent font-black whitespace-nowrap animate-in fade-in duration-300">
                XBNEST PANEL
              </span>
            )}
          </Link>
        </div>

        {/* 导航菜单区域 */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

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
              <span className="font-extrabold text-lg">XBNEST PANEL</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

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
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4 sticky top-0 z-40 select-none">
          <div className="flex items-center gap-4">
            {/* 移动端菜单激活按钮 */}
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
                <div key={crumb.path} className="flex items-center">
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
            {/* 消息通知 (仅作高颜值点缀) */}
            <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 dark:hover:bg-zinc-800">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

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
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-300 dark:border-zinc-700">
                  {user?.username?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />}
                </div>
                <div className="hidden lg:flex flex-col items-start text-left shrink-0">
                  <span className="text-sm font-semibold leading-none">{user?.nickname || user?.username || '管理员'}</span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 uppercase font-semibold">
                    {user?.role?.name || '无角色'}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 dark:bg-zinc-900 dark:border-zinc-800">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email || '未绑定邮箱'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="dark:bg-zinc-800" />
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>个人中心</span>
                </DropdownMenuItem>
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
        </header>

        {/* 3. 子页面渲染主体 */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
