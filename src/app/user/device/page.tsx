'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, Power, Activity, ShieldCheck, RefreshCw, HardDrive, Lock, Unlock, Wifi, Battery, Mail, Bell, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/store/useUserStore';
import { api } from '@/lib/axios';

interface ClientDevice {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline';
  temperature: number;
  cpuLoad: number;
  rtt: number; // 往返延迟 (ms)
  licenseBound: string;
  heartbeatsCount: number;
  diskSpace?: string;
  // 以下为新增业务监控字段
  scriptMemory?: number;
  isSwitchingAccount?: boolean | number;
  vpnStatus?: boolean;
  isLocked?: boolean;
  battery?: number;
  frontApp?: string;
  deviceType?: string;
}

export default function UserDevicePage() {
  const { user } = useUserStore();
  const code = user?.username; // 当前登录激活码

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<ClientDevice[]>([]);
  const [pingingMap, setPingingMap] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'devices' | 'alertConfig'>('devices');

  // 报警配置表单状态
  const [configEmail, setConfigEmail] = useState('');
  const [configOffline, setConfigOffline] = useState(true);
  const [configLauncher, setConfigLauncher] = useState(true);
  const [configLocked, setConfigLocked] = useState(false);
  const [configVpn, setConfigVpn] = useState(true);
  const [configErrorLog, setConfigErrorLog] = useState(true);
  const [configMemoryLimit, setConfigMemoryLimit] = useState(150); // MB
  const [configSaving, setConfigSaving] = useState(false);

  const getAppFriendlyName = (pkg: string) => {
    if (!pkg || pkg === 'unknown') return '未知前台';
    const lPkg = pkg.toLowerCase();
    if (lPkg.includes('launcher') || lPkg.includes('desktop') || lPkg.includes('launcher3') || lPkg.includes('trebuchet')) {
      return '系统桌面';
    }
    if (pkg.includes('tencent.mm')) return '微信';
    if (pkg.includes('tencent.mobileqq')) return 'QQ';
    if (pkg.includes('sgame')) return '王者荣耀';
    if (pkg.includes('pubgmhd')) return '和平精英';
    const parts = pkg.split('.');
    return parts[parts.length - 1] || pkg;
  };

  const fetchDevices = async () => {
    if (!code) return;
    try {
      const res: any = await api.get('/register-codes/my-devices', {
        params: { code },
      });
      setDevices(res || []);
    } catch (err: any) {
      console.error('[Device] 无法获取端侧设备列表:', err);
    } finally {
      loading && setLoading(false);
    }
  };

  const fetchAlertConfig = async () => {
    if (!code) return;
    try {
      const res: any = await api.get(`/register-codes/my-alert?code=${code}`);
      setConfigEmail(res.alertEmail || '');
      const cfg = res.alertConfig || {};
      setConfigOffline(cfg.offline !== false);
      setConfigLauncher(cfg.launcher !== false);
      setConfigLocked(cfg.locked === true);
      setConfigVpn(cfg.vpn !== false);
      setConfigErrorLog(cfg.errorLog !== false);
      setConfigMemoryLimit(cfg.memoryLimit ? Math.round(cfg.memoryLimit / 1024) : 150);
    } catch (err: any) {
      console.error('获取配置失败:', err);
    }
  };

  const handleSaveAlertConfig = async () => {
    if (!code) return;
    setConfigSaving(true);
    try {
      const payload = {
        code,
        alertEmail: configEmail,
        alertConfig: {
          offline: configOffline,
          launcher: configLauncher,
          locked: configLocked,
          vpn: configVpn,
          errorLog: configErrorLog,
          memoryLimit: configMemoryLimit * 1024, // 存为 KB
        }
      };
      await api.patch('/register-codes/my-alert', payload);
      toast.success('邮件报警推送配置保存成功！');
    } catch (err: any) {
      toast.error(err.message || '保存警报配置失败');
    } finally {
      setConfigSaving(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // 每 15 秒轮询刷新一次设备状态，保障设备心跳指标的准实时性
    const timer = setInterval(fetchDevices, 15000);
    return () => clearInterval(timer);
  }, [code]);

  // 当切换到配置 Tab 时加载最新的推送参数
  useEffect(() => {
    if (activeTab === 'alertConfig') {
      fetchAlertConfig();
    }
  }, [activeTab]);

  // 发送保活心跳：通过向接口发起拉取来实时校验设备网络链路响应
  const handlePing = async (id: string, name: string) => {
    setPingingMap((prev) => ({ ...prev, [id]: true }));
    
    try {
      await fetchDevices();
      toast.success(`设备 [ ${name} ] 网络保活心跳探测校验成功！`);
    } catch {
      toast.error(`设备 [ ${name} ] 探测无回应，请检查物理链路`);
    } finally {
      setPingingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  // 1. 高颜值首屏加载骨架屏
  if (loading && devices.length === 0) {
    return (
      <div className="space-y-6 select-none">
        <div>
          <div className="h-6 bg-zinc-800 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-zinc-900 rounded w-80 mt-2 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-2xl relative overflow-hidden h-[260px] animate-pulse">
              <CardHeader className="pb-2 flex flex-row items-center gap-2.5 space-y-0">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-850"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
                  <div className="h-3 bg-zinc-850 rounded w-2/3"></div>
                </div>
              </CardHeader>
              <CardContent className="py-6 border-y border-zinc-800/40 bg-zinc-950/20">
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 bg-zinc-850 rounded-xl"></div>
                  <div className="h-16 bg-zinc-850 rounded-xl"></div>
                  <div className="h-16 bg-zinc-850 rounded-xl"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 标头及导航 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-150 dark:border-zinc-800/50">
        <div>
          <h1 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            我的端侧设备列表
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
            实时查看当前激活码绑定的物理挂机设备健康状态并个性化调整异常邮件订阅。
          </p>
        </div>

        {/* 现代导航 Tabs */}
        <div className="flex space-x-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl w-fit self-start">
          <button
            onClick={() => setActiveTab('devices')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'devices'
                ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm border border-slate-200/50 dark:border-zinc-800/50"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-850 dark:hover:text-zinc-200"
            )}
          >
            <Cpu className="w-3.5 h-3.5" />
            物理设备 ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('alertConfig')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'alertConfig'
                ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm border border-slate-200/50 dark:border-zinc-800/50"
                : "text-slate-650 dark:text-zinc-400 hover:text-slate-850 dark:hover:text-zinc-200"
            )}
          >
            <Bell className="w-3.5 h-3.5 text-indigo-500" />
            邮件订阅设置
          </button>
        </div>
      </div>

      {/* Tab 1: 我的物理设备列表 */}
      {activeTab === 'devices' && (
        <>
          {devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/10">
              <Cpu className="w-8 h-8 opacity-35 mb-2" />
              <p className="text-xs">当前激活码暂未绑定任何客户端设备</p>
              <p className="text-[10px] text-zinc-650 mt-1">请运行您的物理客户端进行首次登录鉴权激活</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {devices.map((dev) => {
                const isOnline = dev.status === 'online';
                const isPinging = pingingMap[dev.id];
                const isLocked = isOnline && dev.isLocked;
                const isSwitching = isOnline && (dev.isSwitchingAccount === 1 || dev.isSwitchingAccount === true);
                const isAtDesktop = isOnline && !isSwitching && (dev.frontApp?.toLowerCase().includes('launcher') || dev.frontApp?.toLowerCase().includes('desktop') || dev.frontApp === 'unknown');

                return (
                  <Card key={dev.id} className={cn("border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 backdrop-blur shadow-sm dark:shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-350 dark:hover:border-zinc-700",
                    isLocked ? "border-amber-400 dark:border-amber-700/80" : isAtDesktop ? "border-rose-400 dark:border-rose-700/80" : isSwitching ? "border-blue-400 dark:border-blue-700" : ""
                  )}>
                    
                    {/* 锁屏遮罩 */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-amber-500/5 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-10">
                        <div className="bg-amber-500 text-white font-bold text-[10px] px-2 py-1 rounded shadow flex items-center gap-1 animate-bounce">
                          <Lock className="w-3 h-3" />
                          设备已黑屏/休眠锁屏
                        </div>
                      </div>
                    )}

                    {/* 右上角在线状态标签 */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 select-none">
                      <span className="relative flex h-2 w-2">
                        {isOnline && (
                          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isSwitching ? "bg-blue-400" : "bg-emerald-400")}></span>
                        )}
                        <span className={cn("relative inline-flex rounded-full h-2 w-2", isOnline ? (isSwitching ? "bg-blue-500" : "bg-emerald-500") : "bg-slate-300 dark:bg-zinc-650")} />
                      </span>
                      <span className={cn("text-[9px] font-black tracking-widest", isOnline ? (isSwitching ? "text-blue-500 dark:text-blue-400" : "text-emerald-500 dark:text-emerald-400") : "text-slate-400 dark:text-zinc-500")}>
                        {isOnline ? (isSwitching ? '切号切换' : 'ONLINE') : 'OFFLINE'}
                      </span>
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-950 flex items-center justify-center border border-slate-200 dark:border-zinc-850 shadow-sm">
                          <Cpu className={cn("w-5 h-5", isOnline ? (isSwitching ? 'text-blue-500' : 'text-emerald-500 dark:text-emerald-400') : 'text-slate-400 dark:text-zinc-500')} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">{dev.name}</CardTitle>
                          <CardDescription className="text-[10px] font-mono text-slate-450 dark:text-zinc-500">
                            IP: {dev.ip} | 授权码: {dev.licenseBound}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="py-4 border-y border-slate-100 dark:border-zinc-800/40 bg-slate-50/20 dark:bg-zinc-950/20 text-xs space-y-4">
                      
                      {/* 核心端侧挂机指标 */}
                      <div className="grid grid-cols-3 gap-2 text-center select-none">
                        <div className="bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-900/60">
                          <HardDrive className="w-3.5 h-3.5 mx-auto text-amber-500" />
                          <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-extrabold uppercase mt-1">脚本内存</p>
                          <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                            {isOnline ? (dev.scriptMemory ? `${(dev.scriptMemory / 1024).toFixed(1)} MB` : '0.0 MB') : '--'}
                          </p>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-900/60">
                          <Activity className={cn("w-3.5 h-3.5 mx-auto text-sky-500", isOnline && "animate-pulse")} />
                          <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-extrabold uppercase mt-1">前台应用</p>
                          <p className={cn("text-xs font-black mt-0.5 truncate max-w-[85px] mx-auto",
                            isOnline && isSwitching ? "text-blue-500 animate-pulse font-extrabold" : isAtDesktop ? "text-red-500 font-extrabold animate-pulse" : "text-slate-800 dark:text-white"
                          )} title={dev.frontApp}>
                            {isOnline ? (isSwitching ? '🔄 换号中' : getAppFriendlyName(dev.frontApp || '')) : '--'}
                          </p>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-900/60">
                          <Wifi className="w-3.5 h-3.5 mx-auto text-indigo-500" />
                          <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-extrabold uppercase mt-1">网络代理</p>
                          <p className={cn("text-xs font-black mt-0.5",
                            isOnline ? (dev.vpnStatus ? "text-emerald-500" : "text-rose-500 animate-pulse font-extrabold") : "text-slate-800 dark:text-white"
                          )}>
                            {isOnline ? (dev.vpnStatus ? '🛡️ 已连VPN' : '⚠️ 直连(未防封)') : '--'}
                          </p>
                        </div>
                      </div>

                      {/* 安全校验链路 & 延迟 / 心跳 */}
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-1 uppercase tracking-wide">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                          通信检测心跳: <span className="font-mono text-slate-800 dark:text-white text-xs">{isOnline ? `${dev.heartbeatsCount} Pings` : '--'}</span>
                        </span>
                        <span>
                          延迟 (RTT): <span className="font-mono text-slate-800 dark:text-white text-xs">{isOnline ? `${dev.rtt} ms` : '--'}</span>
                        </span>
                      </div>

                      {/* 锁屏与电源状态 / 磁盘未知 */}
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-1 uppercase tracking-wide pt-2 border-t border-slate-100/40 dark:border-zinc-800/20">
                        <span className="flex items-center gap-1">
                          {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />}
                          锁屏检测: {isOnline ? (isLocked ? '已休眠黑屏' : '安全解锁中') : '--'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Battery className="w-3.5 h-3.5 text-sky-500" />
                          物理电源: {isOnline ? (dev.deviceType !== 'real_device' ? '🔌 云手机直供' : `🔋 ${dev.battery}%`) : '--'}
                        </span>
                      </div>

                      {/* 磁盘空间统一降级返回 */}
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-1 uppercase tracking-wide pt-2 border-t border-slate-100/40 dark:border-zinc-800/20">
                        <span className="flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                          外存状态: <span className="font-mono text-slate-800 dark:text-white text-[11px]">{isOnline ? '未知 (云手机/模拟器限制)' : '--'}</span>
                        </span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3 pb-3 bg-slate-50/50 dark:bg-zinc-950/40 flex justify-end border-t border-slate-100/50 dark:border-zinc-850/20">
                      <Button
                        onClick={() => handlePing(dev.id, dev.name)}
                        disabled={isPinging || !isOnline}
                        className="bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-700 dark:text-white text-[10px] font-bold h-8 px-4 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center gap-1.5 transition-all active:scale-97 cursor-pointer"
                      >
                        {isPinging ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-emerald-500 dark:text-emerald-400" />
                            探测连接中...
                          </>
                    ) : (
                      <>
                        <Power className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                        心跳探测
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </>
  )}

  {/* Tab 2: 邮件订阅设置 */}
  {activeTab === 'alertConfig' && (
    <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden max-w-xl mx-auto">
      <CardHeader className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
        <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-500" />
          异常警报邮件推送配置
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
          为您的卡密绑定接收邮箱，当挂机设备出现黑屏死机、闪退桌面或VPN断开等风险时发送通知。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5 text-xs">
        
        {/* 卡密免输显示 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">当前授权卡密</label>
          <div className="font-mono font-bold text-slate-800 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-250/50 dark:border-zinc-850/60 w-fit">
            {code}
          </div>
        </div>

        {/* 邮箱输入框 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">报警接收邮箱 (支持多个，使用分号分隔)</label>
          <input
            type="text"
            placeholder="例如: yourname@qq.com; oncall@company.com"
            value={configEmail}
            onChange={(e) => setConfigEmail(e.target.value.trim())}
            className="w-full px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 订阅细粒度控制开关 */}
        <div className="flex flex-col gap-2 pt-2">
          <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <ListTodo className="w-3.5 h-3.5" />
            事件推送订阅开关
          </label>
          
          <div className="space-y-3 bg-slate-50/50 dark:bg-zinc-950/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-900/60">
            
            {/* 1. 掉线 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-zinc-200">1. 设备意外离线 (offline_unexpected)</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">连续 120 秒未上报心跳且未正常退出时触发警告</p>
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

            {/* 2. 闪退 */}
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
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">VPN 断连暴露真实挂机 IP 时即刻发送通知邮件</p>
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

            {/* 5. 卡死报错 */}
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

            {/* 6. 内存阈值 */}
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
</div>
  );
}
