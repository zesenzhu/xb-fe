'use client';
 
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, Power, Activity, ShieldCheck, RefreshCw, HardDrive, Lock, Unlock, Wifi, Battery, ListTodo, AlertTriangle } from 'lucide-react';
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
  scriptMemory?: number;
  isSwitchingAccount?: boolean | number;
  vpnStatus?: boolean;
  isLocked?: boolean;
  battery?: number;
  frontApp?: string;
  deviceType?: string;
  connectedAt?: string; // 连接握手时间
  currentTask?: string;  // 当前正在执行的任务名称
  runningTime?: number;  // 物理脚本累计已运行时间 (秒)
  lastError?: {
    message: string;
    timestamp: string;
  } | null;
}

export default function UserDeviceListPage() {
  const router = useRouter();
  const { user } = useUserStore();
  const code = user?.username; // 当前登录激活码

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<ClientDevice[]>([]);
  const [pingingMap, setPingingMap] = useState<Record<string, boolean>>({});

  // 前端秒级计时器，用于动态刷新“已运行时间”
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatRunningTime = (secs?: number) => {
    if (secs === undefined || secs === null || secs <= 0) return null;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDurationStr = (connectedAtStr?: string) => {
    if (!connectedAtStr) return '--';
    const start = new Date(connectedAtStr);
    const diff = Math.max(0, now.getTime() - start.getTime());
    const secs = Math.floor(diff / 1000) % 60;
    const mins = Math.floor(diff / 60000) % 60;
    const hours = Math.floor(diff / 3600000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    if (pkg.includes('frxxz') || pkg.includes('frxxcrjpwsbdsdk8') || pkg.includes('凡人修仙传')) {
      return '凡人修仙传:人界篇';
    }
    const parts = pkg.split('.');
    return parts[parts.length - 1] || pkg;
  };

  const fetchDevices = async () => {
    if (!code) return;
    try {
      const res: any = await api.get('/register-codes/my-devices', {
        params: { code: code.trim().toUpperCase() },
      });
      setDevices(res || []);
    } catch (err: any) {
      console.error('[Device] 无法获取端侧设备列表:', err);
    } finally {
      loading && setLoading(false);
    }
  };

  const handleUnbind = async (deviceId: string, deviceName: string) => {
    if (!code) return;
    const confirm = window.confirm(`确定要将设备 [ ${deviceName} ] 从该激活码解绑并强制踢线吗？`);
    if (!confirm) return;
    try {
      await api.patch('/register-codes/my-devices/unbind', { code: code.trim().toUpperCase(), deviceId, operator: 'user' });
      toast.success(`设备 [ ${deviceName} ] 解绑指令下发成功，已强制踢线下线`);
      fetchDevices();
    } catch (err: any) {
      toast.error(err.message || '解绑设备失败');
    }
  };

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

  useEffect(() => {
    fetchDevices();
    const timer = setInterval(fetchDevices, 15000);
    return () => clearInterval(timer);
  }, [code]);

  if (loading && devices.length === 0) {
    return (
      <div className="space-y-6 select-none">
        <div>
          <div className="h-6 bg-slate-200 dark:bg-zinc-800 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-slate-200 dark:bg-zinc-900 rounded w-80 mt-2 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 backdrop-blur shadow-sm animate-pulse h-[260px]">
              <CardHeader className="pb-2 flex flex-row items-center gap-2.5 space-y-0">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 dark:bg-zinc-800 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-100 dark:bg-zinc-855 rounded w-2/3"></div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* 头部面板标题 */}
      <div className="border-b border-slate-200 dark:border-zinc-800/40 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-black text-slate-800 dark:text-white tracking-wide flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-500 animate-pulse shrink-0" />
          我的设备
        </h1>
      </div>

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-850 rounded-2xl bg-white dark:bg-zinc-950/10">
          <Cpu className="w-8 h-8 opacity-35 mb-2 text-slate-400" />
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
                      <CardDescription className="text-[10px] font-mono text-slate-450 dark:text-zinc-550">
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
                      <RefreshCw className="w-3.5 h-3.5 mx-auto text-emerald-500" />
                      <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-extrabold uppercase mt-1">已运行时间</p>
                      <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5 font-mono">
                        {isOnline ? (formatRunningTime(dev.runningTime) || getDurationStr(dev.connectedAt)) : '--'}
                      </p>
                    </div>
                  </div>

                  {/* 当前正在跑的任务 */}
                  {isOnline && dev.currentTask && (
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950/45 border border-slate-200/40 dark:border-zinc-850/60 p-2 rounded-xl text-[11px] font-medium text-slate-600 dark:text-zinc-350 select-none">
                      <ListTodo className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                      <span className="text-slate-400 dark:text-zinc-500 font-semibold text-[10px] uppercase">当前任务:</span>
                      <span className="truncate flex-1 font-bold text-slate-700 dark:text-zinc-200" title={dev.currentTask}>
                        {dev.currentTask}
                      </span>
                    </div>
                  )}

                  {/* 崩溃与脚本异常警报区域 */}
                  {dev.lastError && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-[11px] text-rose-700 dark:text-rose-400 space-y-1 select-none">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500 animate-bounce" />
                        <span>最近脚本异常警报:</span>
                      </div>
                      <p className="font-mono break-all line-clamp-2 leading-relaxed text-rose-800 dark:text-rose-300">
                        {dev.lastError.message.startsWith('CRASH_REPORT:')
                          ? (() => {
                              const msg = dev.lastError.message;
                              const task = msg.match(/任务=\[(.*?)\]/)?.[1] || '未知任务';
                              const line = msg.match(/:(\d+):/)?.[1] ? `第 ${msg.match(/:(\d+):/)?.[1]} 行` : '未知行';
                              const reason = msg.match(/原因=\[(.*?)\]/)?.[1] || '未知原因';
                              return `崩溃任务 [${task}] (${line}): ${reason}`;
                            })()
                          : dev.lastError.message}
                      </p>
                      <div className="text-[9px] text-rose-500/70 dark:text-rose-450 flex justify-between items-center pt-0.5">
                        <span>发生时间: {new Date(dev.lastError.timestamp).toLocaleString()}</span>
                        <button
                          onClick={() => {
                            window.alert(`【脚本崩溃调用栈详情】\n\n报错时间：${new Date(dev.lastError!.timestamp).toLocaleString()}\n\n上报原文：\n${dev.lastError!.message}`);
                          }}
                          className="underline hover:text-rose-900 dark:hover:text-rose-200 font-extrabold cursor-pointer"
                        >
                          查看堆栈
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 安全校验链路心跳检测 */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-1 uppercase tracking-wide">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      通信检测心跳: <span className="font-mono text-slate-800 dark:text-white text-xs">{isOnline ? `${dev.heartbeatsCount} Pings` : '--'}</span>
                    </span>
                    <span className="flex items-center gap-1 select-none">
                      延迟性能: <span className="font-mono text-emerald-500 dark:text-emerald-400">稳定</span>
                    </span>
                  </div>

                  {/* 锁屏与电源状态 */}
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

                  {/* 网络代理与VPN小标提示 */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 px-1 uppercase tracking-wide pt-2 border-t border-slate-100/40 dark:border-zinc-800/20">
                    <span className="flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                      网络安全: <span className="text-slate-800 dark:text-white font-medium">{isOnline ? (dev.vpnStatus ? '🛡️ 已开启 VPN (防封保护中)' : '⚠️ 直连挂机 (存在封号风险，推荐开启VPN)') : '--'}</span>
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 pb-3 bg-slate-50/50 dark:bg-zinc-950/40 flex justify-between gap-2 border-t border-slate-100/50 dark:border-zinc-850/20">
                  <Button
                    onClick={() => handleUnbind(dev.id, dev.name)}
                    variant="outline"
                    className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold h-8 px-3 rounded-xl border border-rose-200/50 dark:border-rose-900/40 flex items-center gap-1.5 transition-all active:scale-97 cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    解绑
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handlePing(dev.id, dev.name)}
                      disabled={isPinging || !isOnline}
                      variant="outline"
                      className="bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-700 dark:text-white text-[10px] font-bold h-8 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center gap-1.5 transition-all active:scale-97 cursor-pointer"
                    >
                      {isPinging ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                      ) : (
                        <Power className="w-3 h-3 text-emerald-500" />
                      )}
                      探测
                    </Button>

                    <Button
                      onClick={() => router.push(`/user/log?deviceId=${dev.id}`)}
                      className="bg-emerald-500 hover:bg-emerald-450 dark:bg-emerald-600 dark:hover:bg-emerald-550 text-zinc-950 dark:text-white text-[10px] font-black h-8 px-3 rounded-xl flex items-center gap-1.5 transition-all active:scale-97 shadow-md"
                    >
                      <Activity className="w-3 h-3 animate-pulse" />
                      日志详情
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
