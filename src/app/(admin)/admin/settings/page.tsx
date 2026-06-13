'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Save, Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/axios';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // 邮件相关表单状态
  const [mailEnabled, setMailEnabled] = useState(false);
  const [alertMailEnabled, setAlertMailEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');

  // 1. 加载配置
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/system/settings');
      setMailEnabled(data.mail_enabled === 'true');
      setAlertMailEnabled(data.alert_mail_enabled === 'true');
      setSmtpHost(data.smtp_host || '');
      setSmtpPort(data.smtp_port || '465');
      setSmtpUser(data.smtp_user || '');
      setSmtpPass(data.smtp_pass || '');
      setSmtpFrom(data.smtp_from || '');
    } catch (error: any) {
      toast.error(error.message || '加载系统设置失败！');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // 2. 保存配置
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        mail_enabled: mailEnabled ? 'true' : 'false',
        alert_mail_enabled: alertMailEnabled ? 'true' : 'false',
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
        smtp_from: smtpFrom,
      };
      await api.post('/system/settings', payload);
      toast.success('系统设置已成功保存并立即生效！');
      // 重新拉取以更新 ****** 状态
      fetchSettings();
    } catch (error: any) {
      toast.error(error.message || '保存设置失败，请检查网络！');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400 font-medium">正在安全读取系统配置数据...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 页头 */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">系统设置</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          管理小宝修仙的全局物理配置、SMTP 发信以及安全运行参数。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 左侧页内子菜单 */}
        <div className="md:col-span-1 flex flex-col gap-1.5">
          <button className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 text-left transition-all">
            <Mail className="w-4 h-4" />
            邮件配置
          </button>
        </div>

        {/* 右侧配置面板 */}
        <div className="md:col-span-3">
          <form onSubmit={handleSave} className="space-y-6">
            <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">SMTP 发信服务器配置</CardTitle>
                    <CardDescription className="text-slate-400 dark:text-zinc-500 text-xs mt-1">
                      配置邮件发送账号，激活忘记密码时的邮件验证码自助召回功能。
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="mail-enabled" className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      开启发信功能
                    </Label>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="mail-enabled"
                        checked={mailEnabled}
                        onChange={(e) => setMailEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-700 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mailEnabled ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* SMTP 服务器 */}
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">SMTP 服务器主机</Label>
                        <Input
                          placeholder="例如: smtp.qq.com"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          required
                          className="bg-slate-50/50 dark:bg-zinc-950 focus-visible:ring-emerald-500/50 text-xs"
                        />
                      </div>

                      {/* SMTP 端口 */}
                      <div className="md:col-span-1 space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">端口</Label>
                        <Input
                          placeholder="例如: 465"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          required
                          className="bg-slate-50/50 dark:bg-zinc-950 focus-visible:ring-emerald-500/50 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* SMTP 发件账号 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">发件账号邮箱</Label>
                        <Input
                          type="email"
                          placeholder="例如: xxxxxx@qq.com"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          required
                          className="bg-slate-50/50 dark:bg-zinc-950 focus-visible:ring-emerald-500/50 text-xs"
                        />
                      </div>

                      {/* SMTP 授权密码 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                          发件邮箱授权密码 (或SMTP授权码)
                        </Label>
                        <div className="relative">
                          <Input
                            type={showPass ? 'text' : 'password'}
                            placeholder={smtpPass ? '******' : '输入发信密码或授权码'}
                            value={smtpPass}
                            onChange={(e) => setSmtpPass(e.target.value)}
                            required
                            className="bg-slate-50/50 dark:bg-zinc-950 focus-visible:ring-emerald-500/50 pr-10 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          >
                            {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SMTP 发件人显示 */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">发件人显示（From）</Label>
                      <Input
                        placeholder="例如: 小宝修仙 <xxxxxx@qq.com>"
                        value={smtpFrom}
                        onChange={(e) => setSmtpFrom(e.target.value)}
                        className="bg-slate-50/50 dark:bg-zinc-950 focus-visible:ring-emerald-500/50 text-xs"
                      />
                    </div>

                    {/* 全局异常邮件警报总开关 */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-4 mt-2">
                      <div>
                        <Label className="text-xs font-bold text-slate-800 dark:text-zinc-200">开启设备异常邮件报警系统</Label>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                          允许特定激活卡密绑定邮箱并向其发送设备离线、锁屏、VPN断开等异常提醒。
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="alert-mail-enabled"
                          checked={alertMailEnabled}
                          onChange={(e) => setAlertMailEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-700 peer-checked:bg-emerald-500 animate-in fade-in"></div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 gap-2">
                    <ShieldAlert className="w-6 h-6 text-slate-400" />
                    <p className="text-xs text-slate-500 dark:text-zinc-400 text-center font-medium">
                      全局邮件功能已关闭。登录页的“忘记密码”重置入口将自动隐藏拦截。
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 底部保存条 */}
            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-transform font-bold text-xs gap-2 px-5 py-2.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存配置中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    立即保存设置
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
