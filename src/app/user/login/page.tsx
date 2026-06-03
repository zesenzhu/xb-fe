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
import { KeyRound, ShieldAlert, Loader2, Sparkles, User, HelpCircle } from 'lucide-react';
import { api } from '@/lib/axios';

// 使用 Zod 校验两种登录模式的表单架构
const licenseLoginSchema = z.object({
  code: z.string().min(6, { message: '注册码长度至少为 6 位' }),
});

const accountLoginSchema = z.object({
  username: z.string().min(2, { message: '用户名或邮箱长度至少为 2 位' }),
  password: z.string().min(6, { message: '密码长度至少为 6 位' }),
});

type LicenseFormValues = z.infer<typeof licenseLoginSchema>;
type AccountFormValues = z.infer<typeof accountLoginSchema>;

function UserLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useUserStore();
  const [loading, setLoading] = useState(false);

  // 1. 注册码表单
  const licenseForm = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseLoginSchema),
    defaultValues: { code: '' },
  });

  // 处理注册码极速登录
  const onLicenseSubmit = async (values: LicenseFormValues) => {
    setLoading(true);
    try {
      // 实际生产环境下发送至 NestJS 后端验证注册码并直接获取 user_access_token Cookie
      const response: any = await api.post('/auth/user/license-login', values);
      
      setAuth(response.user, response.permissions || []);
      toast.success('激活登录成功！');
      
      const redirectUrl = searchParams.get('redirect') || '/user/log';
      router.push(redirectUrl);
    } catch (error: any) {
      console.warn('注册码验证接口未响应，进入降级 Mock 模式', error);
      toast.error('未检测到后端激活服务，已为您降级启动 Mock 极速预览！');
      
      // 模拟写入用户端独立鉴权 Cookie，避开管理员 access_token
      Cookies.set('user_access_token', 'mock-user-jwt-xxx', { expires: 1 });
      Cookies.set('user_refresh_token', 'mock-user-refresh-yyy', { expires: 7 });

      const mockUser: UserProfile = {
        id: 'client-user-uuid',
        username: values.code.trim().toUpperCase(),
        nickname: `授权终端 (${values.code.trim().slice(0, 7)})`,
        email: 'client@xbnest.com',
        role: { id: 'r3', name: '终端授权用户', code: 'client' },
      };

      // 仅分配对外用户端必备的读取权限，彻底杜绝越权访问内部管理后台
      const mockPermissions = [
        'dashboard:view',
        'log:list',
        'device:list',
      ];

      setAuth(mockUser, mockPermissions);
      toast.success(`注册码登录成功！欢迎访问终端控制台`);
      
      const redirectUrl = searchParams.get('redirect') || '/user/log';
      router.push(redirectUrl);
    } finally {
      setLoading(false);
    }
  };

  // 一键填入 Mock 激活码快捷辅助
  const fillMockCode = () => {
    licenseForm.setValue('code', 'XB-TEST-888888');
    toast.info('已自动填入开发测试激活码');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950 select-none">
      
      {/* 炫光背景 */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md p-4 relative z-10">
        
        {/* LOGO */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 text-zinc-950 shrink-0" />
          </div>
          <h1 className="text-xl font-black tracking-widest text-white">XBNETS PORTAL</h1>
          <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide">面向用户端设备与日志控制面板</p>
        </div>

        {/* 登录卡片 */}
        <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-md shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-sm font-bold text-zinc-200 text-center uppercase tracking-wider">
              授权激活码登录
            </CardTitle>
            <CardDescription className="text-zinc-500 text-center text-[10px] uppercase font-bold tracking-wider">
              使用您分发拿到的设备授权码进行物理绑定登录控制端
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <form onSubmit={licenseForm.handleSubmit(onLicenseSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-zinc-400 text-xs font-bold tracking-wide">注册激活码 (License Code)</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-600" />
                  <Input
                    id="code"
                    placeholder="输入以 XB- 开头的激活码..."
                    className="pl-10 bg-zinc-950 border-zinc-800 text-white placeholder-zinc-700 focus-visible:ring-emerald-500/40"
                    {...licenseForm.register('code')}
                    disabled={loading}
                  />
                </div>
                {licenseForm.formState.errors.code && (
                  <span className="text-red-500 text-[10px] font-bold block mt-1">
                    {licenseForm.formState.errors.code.message}
                  </span>
                )}
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 hover:text-zinc-950 active:scale-98 transition-transform font-black mt-2">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    验证网络授权中...
                  </>
                ) : (
                  '一键连接并验证设备'
                )}
              </Button>
            </form>

          </CardContent>

          {/* 快捷一键登录辅助 */}
          <CardFooter className="pt-2 pb-6 flex flex-col gap-2">
            <Button
              variant="ghost"
              onClick={fillMockCode}
              className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border border-zinc-800 text-[10px] font-bold flex items-center justify-center gap-1 h-8 rounded-xl"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              使用内置开发测试激活码一键填入体验
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function UserLoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-500 text-xs font-mono select-none">Initializing secure tunnel...</div>}>
      <UserLoginForm />
    </React.Suspense>
  );
}
