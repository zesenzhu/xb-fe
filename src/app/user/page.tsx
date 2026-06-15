'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserPortalIndex() {
  const router = useRouter();

  useEffect(() => {
    // 自动、无感重定向到新的物理设备列表页 (user/device)
    router.replace('/user/device');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    </div>
  );
}
