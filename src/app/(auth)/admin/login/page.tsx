'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useUserStore, UserProfile } from '@/store/useUserStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { KeyRound, User, Loader2 } from 'lucide-react';
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
  const [emailEnabled, setEmailEnabled] = useState(false);

  // 检测后台邮件功能是否开启
  useEffect(() => {
    const checkMailStatus = async () => {
      try {
        const response: any = await api.get('/system/settings/public');
        setEmailEnabled(!!response.emailEnabled);
      } catch (err) {
        console.warn('获取系统邮件功能开启状态失败', err);
        setEmailEnabled(false);
      }
    };
    checkMailStatus();
  }, []);

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
      const accessToken: string = response.accessToken;
      const refreshToken: string = response.refreshToken;
      
      setAuth(userProfile, permissions, accessToken, refreshToken);
      toast.success('登录成功，欢迎回来！');
      
      // 成功后重定向
      const redirectUrl = searchParams.get('redirect') || '/admin/dashboard';
      router.push(redirectUrl);
    } catch (error: any) {
      console.warn('登录接口发生异常', error);
      toast.error(error.message || '登录请求失败，请检查您的用户名或密码！');
    } finally {
      setLoading(false);
    }
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
            <span className="text-slate-950 font-black text-2xl">宝</span>
          </div>
          <h1 className="text-2xl font-black tracking-widest text-white">小宝修仙</h1>
          <p className="text-xs text-slate-400 font-medium">小宝修仙智能后台管理系统</p>
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
                  {emailEnabled && (
                    <Link href="/admin/forgot-password" className="text-[11px] text-emerald-400 hover:underline animate-in fade-in duration-300">
                      忘记密码？
                    </Link>
                  )}
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
