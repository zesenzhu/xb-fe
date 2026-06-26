'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';

export default function UserPortalIndex() {
  const router = useRouter();
  const { user } = useUserStore();

  useEffect(() => {
    // 自动、无感重定向到对应的应用主页或通用设备列表页
    const targetPath = user?.app?.dashboardPath || '/user/apps';
    router.replace(targetPath);
  }, [router, user]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    </div>
  );
}
