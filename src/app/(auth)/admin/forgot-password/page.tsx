'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, KeyRound, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/axios';

// 定义 Zod 表单校验架构
const resetSchema = z.object({
  email: z.string().email({ message: '请输入合法的邮箱地址' }),
  code: z.string().min(6, { message: '验证码至少为 6 位' }),
  newPassword: z.string().min(6, { message: '新密码长度至少为 6 位' }),
  confirmPassword: z.string().min(6, { message: '确认密码长度至少为 6 位' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的新密码不一致',
  path: ['confirmPassword'],
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);

  // 验证码倒计时状态
  const [countdown, setCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // 1. 初始化时检测系统邮箱功能是否开启
  useEffect(() => {
    const checkMailStatus = async () => {
      try {
        const response: any = await api.get('/system/settings/public');
        setEmailEnabled(!!response.emailEnabled);
      } catch (err) {
        console.warn('获取邮件开启状态失败', err);
        setEmailEnabled(false);
      } finally {
        setEmailChecked(true);
      }
    };
    checkMailStatus();
  }, []);

  // 2. 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 3. 发送验证码
  const handleSendCode = async () => {
    const emailValid = await trigger('email');
    if (!emailValid) return;

    const email = getValues('email');
    setSendingCode(true);
    try {
      await api.post('/auth/forgot-password/send-code', { email });
      toast.success('验证码发送成功，请前往邮箱查收（测试模式下请查看控制台日志）');
      setCountdown(60);
    } catch (error: any) {
      toast.error(error.message || '发送验证码失败，请确认您的邮箱正确注册过管理员账号！');
    } finally {
      setSendingCode(false);
    }
  };

  // 4. 重置密码提交
  const onSubmit = async (values: ResetFormValues) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/reset', {
        email: values.email,
        code: values.code,
        newPassword: values.newPassword,
      });
      toast.success('您的密码已重置成功，请重新登录！');
      router.push('/admin/login');
    } catch (error: any) {
      toast.error(error.message || '密码重置失败，请检查验证码是否正确或已过期！');
    } finally {
      setLoading(false);
    }
  };

  if (!emailChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-xs font-mono select-none">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-500" />
        正在进行系统安全检查...
      </div>
    );
  }

  // 如果未启用邮件设置，进行强阻断
  if (!emailEnabled) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 select-none">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md p-4 relative z-10">
          <Card className="border-slate-800 bg-slate-950/70 backdrop-blur-md shadow-2xl">
            <CardHeader className="space-y-2 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle className="text-lg font-bold text-white">系统邮件服务未启用</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                本系统尚未配置或开启 SMTP 邮件验证码服务。管理员无法自主重置密码，请联系系统拥有者在数据库或系统后台配置中手动重置。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pt-2">
              <Link href="/admin/login" className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-bold hover:underline transition-all">
                <ArrowLeft className="w-4 h-4" />
                返回登录页面
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 select-none">
      
      {/* 动态背景 */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md p-4 relative z-10">
        
        {/* LOGO */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg border border-slate-700/50">
            <span className="text-slate-950 font-black text-2xl">宝</span>
          </div>
          <h1 className="text-2xl font-black tracking-widest text-white">小宝修仙</h1>
          <p className="text-xs text-slate-400 font-medium">管理员密码安全召回系统</p>
        </div>

        {/* 召回表单卡片 */}
        <Card className="border-slate-800 bg-slate-950/70 backdrop-blur-md shadow-2xl relative">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-white text-center">密码安全重置</CardTitle>
            <CardDescription className="text-slate-400 text-center text-xs">
              输入您的注册邮箱接收验证码以修改您的账户密码
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* 邮箱输入与发送按钮 */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-xs font-semibold">注册邮箱地址</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="输入管理员绑定邮箱"
                      className="pl-10 bg-slate-900/50 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-emerald-500/50 text-xs"
                      {...register('email')}
                      disabled={loading || sendingCode}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || sendingCode || loading}
                    className="border-slate-800 hover:bg-slate-900 text-white hover:text-white bg-transparent shrink-0 text-xs font-bold w-28"
                  >
                    {sendingCode ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : countdown > 0 ? (
                      `${countdown} 秒`
                    ) : (
                      '发送验证码'
                    )}
                  </Button>
                </div>
                {errors.email && (
                  <span className="text-red-500 text-[11px] font-medium block mt-1">
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* 验证码输入 */}
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-slate-300 text-xs font-semibold">邮箱验证码</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="code"
                    placeholder="输入收到的 6 位数字验证码"
                    className="pl-10 bg-slate-900/50 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-emerald-500/50 text-xs"
                    {...register('code')}
                    disabled={loading}
                  />
                </div>
                {errors.code && (
                  <span className="text-red-500 text-[11px] font-medium block mt-1">
                    {errors.code.message}
                  </span>
                )}
              </div>

              {/* 新密码 */}
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-slate-300 text-xs font-semibold">新登录密码</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="输入6位以上的新密码"
                    className="pl-10 bg-slate-900/50 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-emerald-500/50 text-xs"
                    {...register('newPassword')}
                    disabled={loading}
                  />
                </div>
                {errors.newPassword && (
                  <span className="text-red-500 text-[11px] font-medium block mt-1">
                    {errors.newPassword.message}
                  </span>
                )}
              </div>

              {/* 确认新密码 */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-slate-300 text-xs font-semibold">确认新密码</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="再次输入以确认新密码"
                    className="pl-10 bg-slate-900/50 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-emerald-500/50 text-xs"
                    {...register('confirmPassword')}
                    disabled={loading}
                  />
                </div>
                {errors.confirmPassword && (
                  <span className="text-red-500 text-[11px] font-medium block mt-1">
                    {errors.confirmPassword.message}
                  </span>
                )}
              </div>

              {/* 提交重置 */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-transform font-bold mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在校验重置密码...
                  </>
                ) : (
                  '确认修改密码'
                )}
              </Button>
            </form>

            <div className="flex justify-center border-t border-slate-800/80 pt-4">
              <Link href="/admin/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                返回账号登录
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
