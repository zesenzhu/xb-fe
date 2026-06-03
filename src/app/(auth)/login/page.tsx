'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { useUserStore, UserProfile } from '@/store/useUserStore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { KeyRound, Mail, User, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';

// 使用 Zod 定义前端严格的表单校验架构
const loginSchema = z.object({
  username: z.string().min(2, { message: '用户名或邮箱长度至少为 2 位' }),
  password: z.string().min(6, { message: '密码长度至少为 6 位' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useUserStore();
  const [loading, setLoading] = useState(false);

  // 初始化 React Hook Form 与 Zod 校验器
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // 处理登录请求（支持正式后端 API 联调 + 智能 Mock 便捷预览）
  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      // 1. 发起正式的 NestJS 接口请求
      // 注意：真实场景下后端会在响应头中 Set-Cookie 写入 httpOnly 的 access_token
      // 同时返回用户信息与权限列表
      const response: any = await api.post('/auth/admin/login', values);
      
      const userProfile: UserProfile = response.user;
      const permissions: string[] = response.permissions || [];
      
      setAuth(userProfile, permissions);
      toast.success('登录成功，欢迎回来！');
      
      // 成功后重定向
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl);
    } catch (error: any) {
      // 2. 如果后端接口尚未部署或报错，系统将优雅降级到提示，并提供极速 Mock 测试通道
      console.warn('正式登录接口未响应，进入预览测试模式', error);
      toast.error(error.message || '正式登录请求失败，请尝试使用下方“一键快捷体验”通道预览系统！');
    } finally {
      setLoading(false);
    }
  };

  // Mock 一键体验快捷通道
  const handleMockLogin = (roleType: 'admin' | 'operator') => {
    setLoading(true);
    setTimeout(() => {
      // 模拟后端写入的访问 Cookie (以通过 Middleware 校验)
      Cookies.set('access_token', 'mock-jwt-token-xyz', { expires: 1 });
      Cookies.set('refresh_token', 'mock-refresh-token-abc', { expires: 7 });

      let mockUser: UserProfile;
      let mockPermissions: string[];

      if (roleType === 'admin') {
        mockUser = {
          id: 'admin-uuid-1',
          username: 'admin',
          nickname: '超级管理员',
          email: 'admin@xbnest.com',
          role: { id: 'r1', name: '超级管理员', code: 'admin' },
        };
        // 超级管理员通配符权限，解锁全部后台侧边菜单与操作按钮
        mockPermissions = ['*'];
      } else {
        mockUser = {
          id: 'op-uuid-2',
          username: 'operator',
          nickname: '运营维护专员',
          email: 'op@xbnest.com',
          role: { id: 'r2', name: '运营专员', code: 'operator' },
        };
        // 普通人员受限权限，禁用部分管理菜单与回收/删除等高危操作
        mockPermissions = [
          'dashboard:view',
          'code:list',
          'code:create',
          'log:list',
          'device:list',
        ];
      }

      setAuth(mockUser, mockPermissions);
      toast.success(`一键快捷登录成功！当前身份：${mockUser.nickname}`);
      
      const redirectUrl = searchParams.get('redirect') || '/dashboard';
      router.push(redirectUrl);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 select-none">
      
      {/* 炫酷的动态极光球背景装饰 */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md p-4 relative z-10">
        
        {/* 控制台精美 LOGO */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg border border-slate-700/50">
            <span className="text-slate-950 font-black text-2xl">XB</span>
          </div>
          <h1 className="text-2xl font-black tracking-widest text-white">XBNEST CONSOLE</h1>
          <p className="text-xs text-slate-400 font-medium">全栈智能后台设备控制系统</p>
        </div>

        {/* 磨砂玻璃拟物登录卡片 */}
        <Card className="border-slate-800 bg-slate-950/70 backdrop-blur-md shadow-2xl relative">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-white text-center">账户安全登录</CardTitle>
            <CardDescription className="text-slate-400 text-center text-xs">
              输入您的后台账号及密码以进入管理平台
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 用户名/邮箱输入栏 */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-slate-300 text-xs font-semibold">用户名 / 邮箱</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="username"
                    placeholder="输入用户名"
                    className="pl-10 bg-slate-900/50 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-emerald-500/50"
                    {...register('username')}
                    disabled={loading}
                  />
                </div>
                {errors.username && (
                  <span className="text-red-500 text-[11px] font-medium block mt-1 animate-in fade-in duration-200">
                    {errors.username.message}
                  </span>
                )}
              </div>

              {/* 密码输入栏 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300 text-xs font-semibold">登录密码</Label>
                  <a href="#" className="text-[11px] text-emerald-400 hover:underline">忘记密码？</a>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="输入6位以上密码"
                    className="pl-10 bg-slate-900/50 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-emerald-500/50"
                    {...register('password')}
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <span className="text-red-500 text-[11px] font-medium block mt-1 animate-in fade-in duration-200">
                    {errors.password.message}
                  </span>
                )}
              </div>

              {/* 登录提交按钮 */}
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-transform font-bold mt-2">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在认证校验...
                  </>
                ) : (
                  '立即安全登录'
                )}
              </Button>
            </form>
          </CardContent>

          {/* 装饰分割线 */}
          <div className="relative px-6 py-2">
            <div className="absolute inset-0 flex items-center px-6">
              <span className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-950 px-2 text-[10px] text-slate-500 font-bold tracking-wider">
                或使用快捷一键体验
              </span>
            </div>
          </div>

          {/* 快捷通道按钮 */}
          <CardFooter className="flex flex-col gap-2 pt-2 pb-6">
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => handleMockLogin('admin')}
                disabled={loading}
                className="border-slate-800 bg-slate-900/30 text-white hover:bg-slate-800 hover:text-white flex items-center justify-center gap-1.5 text-xs py-2 font-semibold transition-all active:scale-97"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                超级管理员
              </Button>
              <Button
                variant="outline"
                onClick={() => handleMockLogin('operator')}
                disabled={loading}
                className="border-slate-800 bg-slate-900/30 text-white hover:bg-slate-800 hover:text-white flex items-center justify-center gap-1.5 text-xs py-2 font-semibold transition-all active:scale-97"
              >
                <User className="w-4 h-4 text-sky-400" />
                运营维护专员
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-xs font-mono select-none">Loading security gateway...</div>}>
      <LoginForm />
    </React.Suspense>
  );
}
