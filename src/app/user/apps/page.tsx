'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, ShieldCheck, Sparkles, Loader2, Info, LogOut, User as UserIcon } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { disconnectSocket } from '@/lib/socket';

interface AppItem {
  id: string;
  name: string;
  appKey: string;
  description?: string;
  dashboardPath?: string;
  status: number;
  features: any[];
}

export default function AppsPortalPage() {
  const router = useRouter();
  const { user, clearAuth } = useUserStore();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 如果是专用型卡密，直接重定向到他的专属页面
  useEffect(() => {
    if (user?.app?.dashboardPath) {
      router.replace(user.app.dashboardPath);
    }
  }, [user, router]);

  // 2. 拉取所有已启用的应用列表
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const data: any = await api.get('/apps');
        // 仅展示启用的应用
        const activeApps = (data || []).filter((app: any) => app.status === 1);
        setApps(activeApps);
      } catch (err: any) {
        toast.error(err.message || '拉取应用列表失败');
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  // 用户端登出逻辑
  const handleLogout = async () => {
    try {
      await api.post('/auth/user/logout')
    } catch (err) {
      console.error('退出登录调用接口失败:', err)
    }
    Cookies.remove('user_access_token')
    Cookies.remove('user_refresh_token')
    disconnectSocket() // 主动断开 WebSockets 长链接
    clearAuth()
    toast.success('您已成功安全退出控制终端')
    window.location.href = '/user/login'
  }

  // 格式化渲染剩余时间
  const renderRemainingTime = (expireTime?: string) => {
    if (!expireTime) return '计算中...'
    const expire = new Date(expireTime)
    const now = new Date()
    const diffMs = expire.getTime() - now.getTime()

    if (diffMs <= 0) {
      return '已到期'
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    )
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffDays > 0) {
      return `${diffDays}天${diffHours}小时`
    }
    if (diffHours > 0) {
      return `${diffHours}小时${diffMinutes}分钟`
    }
    return `${diffMinutes}分钟`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // 如果专用卡密已经被重定向了，这里不会展示
  if (user?.app?.dashboardPath) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-zinc-100 flex flex-col font-sans select-none">
      {/* 独立顶栏 Header */}
      <header className="h-16 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
        {/* LOGO */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-bold tracking-widest text-white">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Sparkles className="w-4 h-4 text-zinc-950 shrink-0" />
            </div>
            <span className="text-sm font-black whitespace-nowrap bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              小宝修仙
            </span>
          </div>
          <div className="h-4 w-px bg-zinc-900 hidden sm:block" />
          <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider text-zinc-500">
            应用选择大厅
          </span>
        </div>

        {/* 右侧信息与退出 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0 border border-zinc-800">
              {user?.username?.charAt(0).toUpperCase() || (
                <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-extrabold text-white leading-none">
                {user?.nickname || user?.username || '终端用户'}
              </span>
              {user?.expireTime && (
                <span className="text-[9px] text-zinc-500 mt-1 font-mono tracking-wider">
                  剩余时长: {renderRemainingTime(user.expireTime)}
                </span>
              )}
            </div>
          </div>
          
          <div className="h-5 w-px bg-zinc-800" />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl hover:bg-red-950/20 text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-950/40"
            title="安全退出"
          >
            <LogOut className="w-4.5 h-4.5" />
          </Button>
        </div>
      </header>

      {/* 主体大屏区域 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">


        {/* 应用卡片列表 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-zinc-200 tracking-wider flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-emerald-500 shrink-0" />
              可选择的游戏项目 ({apps.length})
            </h2>
          </div>

          {apps.length === 0 ? (
            <Card className="border-dashed border-zinc-800 bg-zinc-900/20">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Info className="w-10 h-10 text-zinc-600 mb-4" />
                <h3 className="font-extrabold text-sm text-zinc-400">暂无可用的应用大屏</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  平台管理员暂未配置启用任何游戏脚本应用，请稍后重试或联系管理员。
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => {
                const targetPath = app.dashboardPath || `/user/apps/${app.appKey}`;
                return (
                  <Card
                    key={app.id}
                    onClick={() => router.push(targetPath)}
                    className="group relative border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-lg overflow-hidden flex flex-col hover:border-emerald-500/30 hover:bg-zinc-900/60 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="font-black text-base text-zinc-100 group-hover:text-emerald-400 transition-colors">
                            {app.name}
                          </span>
                          <CardDescription className="text-xs text-zinc-500 truncate max-w-[200px]">
                            {app.description || '无应用描述'}
                          </CardDescription>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-800 font-mono font-bold group-hover:border-emerald-500/20 group-hover:text-emerald-300 transition-colors">
                          {app.appKey}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-end pt-2 min-h-[80px]">
                      <div className="border-t border-zinc-800/85 my-2" />
                      
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1 font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          功能权限数: {app.features?.length || 0} 个
                        </span>
                        <Button
                          variant="link"
                          className="text-[10px] text-emerald-500 group-hover:text-emerald-400 p-0 font-extrabold h-auto transition-colors"
                        >
                          进入大屏 &rarr;
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
