/**
 * @file page.tsx
 * @description 小宝修仙管理端安全登录入口页面（服务端路由组件）。负责渲染客户端登录表单并包装在 React.Suspense 容器内。
 * @author AI Assistant
 * @date 2026-06-13
 *
 * [核心职责]
 * 1. 动态路由强制：使用 `force-dynamic` 避开静态编译，保证每次前端部署升级后，旧 HTML 强缓存不会引用到被删除的旧 JS Chunk；
 * 2. 路由隔离：利用 `<React.Suspense>` 将使用 `useSearchParams()` 的 `LoginForm` 包装隔离，防止 Next.js 在 build 阶段报错挂起。
 *
 * [使用场景]
 * - 后台管理登录根页面 `/admin/login`。
 */

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
