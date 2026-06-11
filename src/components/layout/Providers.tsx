'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useGlobalStore } from '@/store/useGlobalStore';
import { Toaster } from '@/components/ui/sonner';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  // 1. 创建并维护 React Query Client 实例，确保在客户端单例运行
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false, // 窗口获得焦点时不自动重试
            retry: 1, // 失败自动重试1次
          },
        },
      })
  );

  // 2. 从 Zustand 读取当前的主题状态 ('light' | 'dark')
  const { theme, setTheme } = useGlobalStore();
  const [mounted, setMounted] = useState(false);

  // 避免服务端与客户端 HTML 激活冲突 (Hydration Mismatch)
  useEffect(() => {
    setMounted(true);
    // 初始化时，如果本地存储有主题，写入到 html class 中
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // 如果还没挂载，渲染一个占位或者采用默认 Light 主题防闪烁
  const isDark = mounted && theme === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <AntdRegistry>
        <ConfigProvider
          locale={zhCN}
          theme={{
            algorithm: isDark
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
            token: {
              colorPrimary: isDark ? '#ffffff' : '#0f172a', // 💡 在暗色模式下使用白色以提供高对比度
              borderRadius: 6,
              fontFamily: 'inherit',
            },
            components: {
              Table: {
                headerBg: isDark ? '#1e293b' : '#f8fafc',
                headerColor: isDark ? '#f8fafc' : '#0f172a',
              },
            },
          }}
        >
          {children}
          {/* 集成 shadcn 的 sonner 消息吐司，位于右上方 */}
          <Toaster position="top-right" richColors />
        </ConfigProvider>
      </AntdRegistry>
    </QueryClientProvider>
  );
};

export default Providers;
