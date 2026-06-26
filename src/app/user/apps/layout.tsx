'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';

export default function AppsRouteGuardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useUserStore();
  const [authorized, setAuthorized] = useState(false);

  const isGeneralUser = !user?.app; // 是否是通用卡密
  const userDashboard = user?.app?.dashboardPath; // 绑定应用时的路由路径，例如 "/user/apps/frxxzrjp"

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/user/login');
      return;
    }

    // 1. 通用型激活码具有超级权限，豁免本防越权拦截器的阻断，可以直接查看任意专属应用大屏
    if (isGeneralUser) {
      setAuthorized(true);
      return;
    }

    // 2. 专用激活码安全防御：防越权和 URL 手改混用
    // 允许访问其专属的 dashboard 页面。如果访问 /user/apps 或者是其他页面，自动跳转回他的专属路由。
    if (userDashboard && pathname !== userDashboard && pathname.startsWith('/user/apps')) {
      toast.warning('您无权访问当前游戏的控制台，已为您带回您的专属挂机大屏！');
      router.replace(userDashboard);
      return;
    }

    setAuthorized(true);
  }, [isAuthenticated, isGeneralUser, userDashboard, pathname, router]);

  if (!authorized) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center bg-zinc-950/20 rounded-2xl border border-zinc-800/40 backdrop-blur-md">
        <div className="relative w-10 h-10 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-zinc-500 text-xs font-mono tracking-widest uppercase animate-pulse">
          安全信道鉴权中...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
