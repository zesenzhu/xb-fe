'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, ShieldCheck, Lock, Unlock, Mail, ListTodo, Bell, HelpCircle, Smartphone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/store/useUserStore';
import { api } from '@/lib/axios';

interface AuditHistory {
  id: string;
  deviceId: string;
  deviceName: string | null;
  lastIp: string | null;
  boundAt: string;
  unbindAt: string;
  unbindReason: string;
}

interface BlacklistItem {
  id: string;
  deviceId: string;
  deviceName: string | null;
  blockedAt: string;
  reason: string | null;
}

interface AlertConfigResponse {
  alertEmail: string | null;
  alertConfig: {
    offline?: boolean;
    offlineTimeout?: number;
    launcher?: boolean;
    locked?: boolean;
    vpn?: boolean;
    errorLog?: boolean;
    memoryLimit?: number;
    preventDuplicateAccount?: boolean;
    duplicateAction?: 'kick_new' | 'kick_old';
  } | null;
}

export default function UserSettingsPage() {
  const { user } = useUserStore();
  const code = user?.username; // 当前登录激活码

  const [activeTab, setActiveTab] = useState<'alertConfig' | 'historyBlacklist'>('alertConfig');

  // 报警配置表单状态
  const [configEmail, setConfigEmail] = useState('');
  const [configOffline, setConfigOffline] = useState(true);
  const [configOfflineTimeout, setConfigOfflineTimeout] = useState(10); // 分钟
  const [configLauncher, setConfigLauncher] = useState(true);
  const [configLocked, setConfigLocked] = useState(false);
  const [configVpn, setConfigVpn] = useState(true);
  const [configErrorLog, setConfigErrorLog] = useState(true);
  const [configMemoryLimit, setConfigMemoryLimit] = useState(150); // MB
  const [configSaving, setConfigSaving] = useState(false);

  // 【新增】防多开防共享配置状态
  const [configPreventDuplicate, setConfigPreventDuplicate] = useState(false);
  const [configDuplicateAction, setConfigDuplicateAction] = useState<'kick_new' | 'kick_old'>('kick_new');

  // 【新增】PWA 桌面推送通知状态
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  // 转换 VAPID 公钥为 Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // 检测桌面推送订阅状态
  const checkPushSubscription = async () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
        
        if (Notification.permission === 'denied') {
          setShowGuide(true);
        }
      } catch (err) {
        console.error('检测推送订阅失败:', err);
      }
    }
  };

  // 切换桌面推送
  const handleTogglePush = async (checked: boolean) => {
    if (!isPushSupported) {
      toast.error('当前浏览器或系统不支持 PWA 桌面推送通知');
      return;
    }

    setIsPushLoading(true);
    if (checked) {
      // 申请权限
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsSubscribed(false);
        setShowGuide(true);
        toast.error('您拒绝了通知权限，请按照下方指引重新允许');
        setIsPushLoading(false);
        return;
      }

      setShowGuide(false);
      try {
        // 从后端获取 VAPID 公钥
        const res = await api.get<any, any>('/register-codes/vapid-public-key');
        const publicKey = res.publicKey || (res as any).data?.publicKey;
        
        // 订阅推送
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // 提交至后端
        await api.post('/register-codes/subscribe-push', { code, subscription });
        setIsSubscribed(true);
        toast.success('🎉 成功为该设备订阅此浏览器的桌面通知气泡！');
      } catch (err) {
        console.error('订阅推送失败:', err);
        toast.error('启用桌面推送失败，请刷新页面后重试');
      }
    } else {
      // 取消订阅
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await api.post('/register-codes/unsubscribe-push', { code, endpoint: sub.endpoint });
        }
        setIsSubscribed(false);
        toast.success('已停用此浏览器的桌面通知接收');
      } catch (err) {
        console.error('注销推送失败:', err);
        toast.error('停用桌面推送失败');
      }
    }
    setIsPushLoading(false);
  };

  // 历史记录与黑名单状态
  const [historyList, setHistoryList] = useState<AuditHistory[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSaveAlertConfig = async () => {
    if (!code) return;
    setConfigSaving(true);
    try {
      const payload = {
        code,
        alertEmail: configEmail,
        alertConfig: {
          offline: configOffline,
          offlineTimeout: configOfflineTimeout,
          launcher: configLauncher,
          locked: configLocked,
          vpn: configVpn,
          errorLog: configErrorLog,
          memoryLimit: configMemoryLimit * 1024, // 存为 KB
          preventDuplicateAccount: configPreventDuplicate,
          duplicateAction: configDuplicateAction,
        }
      };
      await api.patch('/register-codes/my-alert', payload);
      toast.success('邮件报警推送配置保存成功！');
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || '保存警报配置失败');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleAddBlacklist = async (deviceId: string, deviceName: string) => {
    if (!code) return;
    const reason = window.prompt(`请输入拉黑设备 [ ${deviceName} ] 的原因（选填）:`);
    if (reason === null) return;
    try {
      await api.post('/register-codes/my-devices/blacklist', { code, deviceId, deviceName, reason, operator: 'user' });
      toast.success(`设备 [ ${deviceName} ] 已成功加入黑名单，禁止再绑定此激活码`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || '拉黑失败');
    }
  };

  const handleRemoveBlacklist = async (deviceId: string, deviceName: string) => {
    if (!code) return;
    const confirm = window.confirm(`确定要将设备 [ ${deviceName} ] 移出黑名单并重新允许其绑定吗？`);
    if (!confirm) return;
    try {
      await api.delete('/register-codes/my-devices/blacklist', {
        params: { code, deviceId, operator: 'user' }
      });
      toast.success(`设备 [ ${deviceName} ] 已移出黑名单`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || '解封失败');
    }
  };

  useEffect(() => {
    if (!code) return;
    let active = true;

    if (activeTab === 'alertConfig') {
      checkPushSubscription();
      api.get<unknown, AlertConfigResponse>(`/register-codes/my-alert?code=${code}`)
        .then((data) => {
          if (!active) return;
          setConfigEmail(data.alertEmail || '');
          const cfg = data.alertConfig || {};
          setConfigOffline(cfg.offline !== false);
          setConfigOfflineTimeout(cfg.offlineTimeout ? Math.round(cfg.offlineTimeout) : 10);
          setConfigLauncher(cfg.launcher !== false);
          setConfigLocked(cfg.locked === true);
          setConfigVpn(cfg.vpn !== false);
          setConfigErrorLog(cfg.errorLog !== false);
          setConfigMemoryLimit(cfg.memoryLimit ? Math.round(cfg.memoryLimit / 1024) : 150);
          setConfigPreventDuplicate(cfg.preventDuplicateAccount === true);
          setConfigDuplicateAction(cfg.duplicateAction || 'kick_new');
        })
        .catch((err) => {
          console.error('获取配置失败:', err);
        });
    } else if (activeTab === 'historyBlacklist') {
      Promise.resolve().then(() => {
        if (active) {
          setHistoryLoading(true);
        }
      });
      Promise.all([
        api.get<unknown, AuditHistory[]>('/register-codes/my-devices/history', { params: { code } }),
        api.get<unknown, BlacklistItem[]>('/register-codes/my-devices/blacklist', { params: { code } }),
      ])
        .then(([hist, black]) => {
          if (!active) return;
          setHistoryList(
            (hist || []).map((h) => ({
              ...h,
              deviceName: h.deviceName || '未知设备',
              lastIp: h.lastIp || '127.0.0.1',
            }))
          );
          setBlacklist(
            (black || []).map((b) => ({
              ...b,
              deviceName: b.deviceName || '未知设备',
              reason: b.reason || '无',
            }))
          );
        })
        .catch(() => {
          toast.error('获取历史记录或黑名单失败');
        })
        .finally(() => {
          if (active) {
            setHistoryLoading(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [activeTab, code, refreshTrigger]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 标头及导航 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-150 dark:border-zinc-800/50">
        <h1 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          我的设置
        </h1>

        {/* 现代导航 Tabs */}
        <div className="flex space-x-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl w-fit self-start">
          <button
            onClick={() => setActiveTab('alertConfig')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'alertConfig'
                ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm border border-slate-200/50 dark:border-zinc-800/50"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-850 dark:hover:text-zinc-200"
            )}
          >
            <Bell className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            警报与通知中心
          </button>
          <button
            onClick={() => setActiveTab('historyBlacklist')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'historyBlacklist'
                ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm border border-slate-200/50 dark:border-zinc-800/50"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-850 dark:hover:text-zinc-200"
            )}
          >
            <ListTodo className="w-3.5 h-3.5 text-rose-500" />
            历史记录与黑名单
          </button>
        </div>
      </div>

      {/* Tab 2: 警报与通知中心 */}
      {activeTab === 'alertConfig' && (
        <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden max-w-xl mx-auto">
          <CardHeader className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-500" />
              设备异常警报推送中心
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              针对挂机设备死机、报错、断开 VPN 等异常状况，提供多通道实时通知守护。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-5 text-xs">
            
            {/* 卡密免输显示 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">当前授权卡密</label>
              <div className="font-mono font-bold text-slate-800 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-250/50 dark:border-zinc-850/60 w-fit">
                {code}
              </div>
            </div>

            {/* 通道一：邮件通知 */}
            <div className="p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-zinc-200">通道 1：邮件报警通知</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">当发生异常时，向绑定的邮箱发送警报邮件</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="请输入您的报警接收邮箱，多个用分号(;)分隔"
                  value={configEmail}
                  onChange={(e) => setConfigEmail(e.target.value.trim())}
                  className="w-full px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 通道二：PWA 浏览器桌面推送 */}
            <div className="p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-zinc-200">通道 2：此浏览器的桌面推送 (PWA)</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">即使关闭了网页，也能通过系统通知栏弹出气泡警告</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={isSubscribed}
                    disabled={isPushLoading || !isPushSupported}
                    onChange={(e) => handleTogglePush(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-700 peer-checked:bg-emerald-500 peer-disabled:opacity-50"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-zinc-800/40 text-[10px]">
                <span className="text-slate-400">当前浏览器订阅状态:</span>
                <span className="font-bold flex items-center gap-1">
                  {!isPushSupported ? (
                    <span className="text-rose-500">🔴 此浏览器不支持 PWA 推送</span>
                  ) : Notification.permission === 'denied' ? (
                    <span className="text-rose-500">🔴 未授权通知 (已被拒绝)</span>
                  ) : isSubscribed ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      🟢 已开启接收
                    </span>
                  ) : (
                    <span className="text-slate-450 dark:text-zinc-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      ⚪ 未订阅桌面通知
                    </span>
                  )}
                </span>
              </div>

              {/* 手动允许通知开启引导 */}
              {(showGuide || !isSubscribed) && isPushSupported && (
                <div className="mt-2 p-3 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 rounded-lg text-slate-650 dark:text-zinc-400 space-y-2">
                  <p className="font-bold text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    桌面通知无法开启？请参考以下指引：
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[10px] leading-relaxed">
                    <li>
                      <strong>Windows / macOS / Chrome 用户：</strong>
                      点击浏览器地址栏左侧的 <strong className="text-slate-700 dark:text-zinc-300">「锁 🔒」</strong> 图标或 <strong className="text-slate-700 dark:text-zinc-300">「设置 ⌥」</strong> 图标，找到“通知”并修改为“允许”。
                    </li>
                    <li>
                      <strong>iOS (苹果手机) 用户：</strong>
                      必须先在 Safari 浏览器中点击底部的 <strong className="text-indigo-500">「分享 📤」</strong> 按钮，选择 <strong className="text-indigo-500">「添加到主屏幕」</strong>。在桌面上打开添加到主屏幕的 App，再重新进入设置页面开启推送通知。
                    </li>
                    <li>
                      <strong>Android (安卓手机) 用户：</strong>
                      建议配合开启邮件报警通知，以在浏览器离线或休眠时获得更可靠的报警通知。
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* 订阅细粒度控制开关 */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                订阅触发事件细分开关
              </label>
              
              <div className="space-y-3 bg-slate-50/50 dark:bg-zinc-950/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-900/60">
                
                {/* 1. 掉线 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">1. 设备意外离线 (offline_unexpected)</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        连续 {configOffline ? configOfflineTimeout : 10} 分钟未上报心跳且未正常退出时触发警告
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={configOffline}
                        onChange={(e) => setConfigOffline(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-700 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                  {configOffline && (
                    <div className="flex items-center gap-2 pl-4 text-[10px] text-slate-500 dark:text-zinc-400">
                      <span>判定时长 (2 - 60 分钟):</span>
                      <input
                        type="number"
                        min={2}
                        max={60}
                        value={configOfflineTimeout}
                        onChange={(e) => setConfigOfflineTimeout(Math.max(2, Math.min(60, Number(e.target.value) || 10)))}
                        className="w-16 px-1.5 py-0.5 text-xs text-slate-800 dark:text-zinc-100 bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 rounded text-center font-mono font-bold"
                      />
                      <span>分钟</span>
                    </div>
                  )}
                </div>

                {/* 2. 游戏闪退 */}
                <div className="flex items-center justify-between border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-zinc-200">2. 游戏闪退回手机桌面 (launcher_detect)</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">设备持续处于手机桌面超过 60 秒时告警 (切号中除外)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={configLauncher}
                      onChange={(e) => setConfigLauncher(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-700 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 3. 锁屏 */}
                <div className="flex items-center justify-between border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-zinc-200">3. 物理休眠黑屏锁屏 (device_locked)</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">屏幕被锁定持续超过 30 秒时触发提醒 (影响模拟点击定位)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={configLocked}
                      onChange={(e) => setConfigLocked(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-700 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 4. VPN */}
                <div className="flex items-center justify-between border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-zinc-200">4. 代理 (VPN) 断开直连警告 (vpn_disconnect)</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">VPN 断连暴露真实挂机 IP时即刻发送通知邮件</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={configVpn}
                      onChange={(e) => setConfigVpn(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-700 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 5. 报错 */}
                <div className="flex items-center justify-between border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-zinc-200">5. 业务致命报错与卡死 (error_log_report)</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">脚本上报 ERROR 级严重日志时发送，发信频率限 5 分钟/次</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={configErrorLog}
                      onChange={(e) => setConfigErrorLog(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-700 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* 6. 内存预警 */}
                <div className="flex items-center justify-between border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-zinc-200">6. 脚本内存泄漏超限预警 (out_of_memory)</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">当脚本占用内存超过此限制时发送警报邮件 (10分钟/次)</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400">上限:</span>
                    <input
                      type="number"
                      min={10}
                      max={1024}
                      value={configMemoryLimit}
                      onChange={(e) => setConfigMemoryLimit(Math.max(10, Math.min(1024, Number(e.target.value) || 150)))}
                      className="w-16 px-1.5 py-0.5 text-xs text-slate-800 dark:text-zinc-100 bg-slate-50 dark:bg-zinc-950 border border-slate-250 dark:border-zinc-800 rounded text-center font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-400">MB</span>
                  </div>
                </div>

                {/* 7. 同卡密多设备防账号共享 */}
                <div className="flex flex-col gap-2 border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">7. 同卡密多设备防账号共享 (preventDuplicateAccount)</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">当多台设备同时登录相同账号时，自动触发防御下线并引导换号</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={configPreventDuplicate}
                        onChange={(e) => setConfigPreventDuplicate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-700 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                  {configPreventDuplicate && (
                    <div className="flex items-center gap-4 pl-4 text-[10px] text-slate-500 dark:text-zinc-400">
                      <span>冲突时执行的动作:</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateAction"
                            value="kick_new"
                            checked={configDuplicateAction === 'kick_new'}
                            onChange={() => setConfigDuplicateAction('kick_new')}
                            className="text-emerald-500 focus:ring-emerald-500"
                          />
                          <span>防御踢新 (更安全)</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateAction"
                            value="kick_old"
                            checked={configDuplicateAction === 'kick_old'}
                            onChange={() => setConfigDuplicateAction('kick_old')}
                            className="text-emerald-500 focus:ring-emerald-500"
                          />
                          <span>抢占踢老</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-3 pb-4 bg-slate-50/50 dark:bg-zinc-950/40 flex justify-end border-t border-slate-100/50 dark:border-zinc-850/20">
            <Button
              onClick={handleSaveAlertConfig}
              disabled={configSaving}
              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4"
            >
              {configSaving ? '保存配置中...' : '保存警报订阅'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Tab 3: 历史记录与黑名单 */}
      {activeTab === 'historyBlacklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          
          {/* 子面板 1: 历史解绑审计 */}
          <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-indigo-500" />
                物理设备解绑审计历史
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                记录此激活码下的物理绑定设备解绑事件。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-x-auto">
              {historyLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">加载历史记录中...</div>
              ) : historyList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">暂无任何解绑记录</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-950 text-slate-450 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-900 font-bold">
                      <th className="p-3">设备</th>
                      <th className="p-3">绑定/解绑时间</th>
                      <th className="p-3">解绑原因</th>
                      <th className="p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((h) => {
                      const isBlocked = blacklist.some((b) => b.deviceId === h.deviceId);
                      return (
                        <tr key={h.id} className="border-b border-slate-100 dark:border-zinc-900/40 text-slate-700 dark:text-zinc-350 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20">
                          <td className="p-3">
                            <div className="font-bold">{h.deviceName}</div>
                            <div className="text-[10px] font-mono text-slate-450 dark:text-zinc-550">{h.deviceId}</div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-555">IP: {h.lastIp}</div>
                          </td>
                          <td className="p-3 space-y-0.5 text-[11px] text-slate-600 dark:text-zinc-400">
                            <div>绑定: {new Date(h.boundAt).toLocaleString('zh-CN')}</div>
                            <div>解绑: {new Date(h.unbindAt).toLocaleString('zh-CN')}</div>
                          </td>
                          <td className="p-3">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold",
                              h.unbindReason === 'admin' ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                            )}>
                              {h.unbindReason === 'admin' ? '管理员强制' : '用户解绑'}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button
                              onClick={() => handleAddBlacklist(h.deviceId, h.deviceName || '未知设备')}
                              disabled={isBlocked}
                              className={cn(
                                "text-[10px] font-bold h-7 px-2.5 rounded-lg border flex items-center gap-1 transition-all active:scale-97 cursor-pointer",
                                isBlocked 
                                  ? "bg-slate-50 text-slate-400 dark:bg-zinc-950 dark:text-zinc-650 border-slate-200 dark:border-zinc-900 cursor-not-allowed"
                                  : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/40"
                              )}
                            >
                              <Lock className="w-3 h-3" />
                              {isBlocked ? '已拉黑' : '拉黑设备'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* 子面板 2: 已拉黑名单 */}
          <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                已拉黑设备名单 (限制绑定)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 dark:text-zinc-550 mt-1">
                拉黑后的设备在使用此激活码进行授权验证时将被直接拦截。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-x-auto">
              {historyLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">加载黑名单中...</div>
              ) : blacklist.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">暂无拉黑设备</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-950 text-slate-450 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-900 font-bold">
                      <th className="p-3">设备</th>
                      <th className="p-3">拉黑时间</th>
                      <th className="p-3">拉黑原因</th>
                      <th className="p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blacklist.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 dark:border-zinc-900/40 text-slate-700 dark:text-zinc-350 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20">
                        <td className="p-3">
                          <div className="font-bold">{b.deviceName}</div>
                          <div className="text-[10px] font-mono text-slate-450 dark:text-zinc-500">{b.deviceId}</div>
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 dark:text-zinc-400">
                          {new Date(b.blockedAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="p-3 truncate max-w-[120px] text-slate-500 dark:text-zinc-400" title={b.reason || undefined}>
                          {b.reason}
                        </td>
                        <td className="p-3">
                          <Button
                            onClick={() => handleRemoveBlacklist(b.deviceId, b.deviceName || '未知设备')}
                            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold h-7 px-2.5 rounded-lg border border-emerald-250 dark:border-emerald-900/40 flex items-center gap-1 transition-all active:scale-97 cursor-pointer"
                          >
                            <Unlock className="w-3 h-3" />
                            解除拉黑
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
