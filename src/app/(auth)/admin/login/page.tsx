import React from 'react';
import { LoginForm } from './LoginForm';

// ⚡ 核心提效防坑：强制设置当前认证网关页面为【动态渲染】模式。
// 绝不允许 Next.js 在打包时将其 Prerender 编译为静态 HTML 页面并持久化强缓存。
// 这彻底解决了在前端更新部署后，旧缓存 HTML 页面因指向不存在的旧 chunk JS 资源导致的 404 页面白屏/挂起 (stuck) 错误。
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-xs font-mono select-none animate-pulse">
        Loading security gateway...
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  );
}
