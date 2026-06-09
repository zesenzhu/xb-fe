'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, Power, Activity, Thermometer, ShieldCheck, Heart, RefreshCw } from 'lucide-react';
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
}

export default function UserDevicePage() {
  const { user } = useUserStore();
  const code = user?.username; // 当前登录激活码

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<ClientDevice[]>([]);
  const [pingingMap, setPingingMap] = useState<Record<string, boolean>>({});

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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // 每 15 秒轮询刷新一次设备状态，保障设备心跳指标的准实时性
    const timer = setInterval(fetchDevices, 15000);
    return () => clearInterval(timer);
  }, [code]);

  // 发送保活心跳：通过向接口发起拉取来实时校验设备网络链路响应
  const handlePing = async (id: string, name: string) => {
    setPingingMap((prev) => ({ ...prev, [id]: true }));
    
    try {
      await fetchDevices();
      toast.success(`设备 [ ${name} ] 网络保活心跳探测校验成功！`);
    } catch (e) {
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
      
      {/* 标头 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            我的端侧设备列表
          </h1>
          <p className="text-[11px] text-zinc-500 font-semibold mt-1">
            当前受监控端侧自研硬件，仅展示与您的注册激活码绑定的设备数据
          </p>
        </div>
        <Button onClick={fetchDevices} variant="outline" size="sm" className="text-xs font-bold border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300">
          手动刷新
        </Button>
      </div>

      {/* 设备网格列表 */}
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

            return (
              <Card key={dev.id} className="border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
                
                {/* 右上角在线状态标签 */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 select-none">
                  <span className="relative flex h-2 w-2">
                    {isOnline && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-zinc-650'}`} />
                  </span>
                  <span className={`text-[9px] font-black tracking-widest ${isOnline ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-850 shadow">
                      <Cpu className={cn("w-5 h-5", isOnline ? 'text-emerald-400' : 'text-zinc-500')} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-white">{dev.name}</CardTitle>
                      <CardDescription className="text-[10px] font-mono text-zinc-500">
                        IP: {dev.ip} | 授权码: {dev.licenseBound}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="py-4 border-y border-zinc-800/40 bg-zinc-950/20 text-xs space-y-4">
                  
                  {/* 硬件运行状态指标 */}
                  <div className="grid grid-cols-3 gap-2 text-center select-none">
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900/60">
                      <Thermometer className="w-3.5 h-3.5 mx-auto text-amber-500" />
                      <p className="text-[9px] text-zinc-500 font-extrabold uppercase mt-1">CPU 温度</p>
                      <p className="text-sm font-black text-white mt-0.5">{isOnline ? `${dev.temperature} °C` : '--'}</p>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900/60">
                      <Activity className={cn("w-3.5 h-3.5 mx-auto text-sky-500", isOnline && "animate-pulse")} />
                      <p className="text-[9px] text-zinc-500 font-extrabold uppercase mt-1">CPU 负载</p>
                      <p className="text-sm font-black text-white mt-0.5">{isOnline ? `${dev.cpuLoad} %` : '--'}</p>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900/60">
                      <Heart className="w-3.5 h-3.5 mx-auto text-pink-500" />
                      <p className="text-[9px] text-zinc-500 font-extrabold uppercase mt-1">物理心跳数</p>
                      <p className="text-sm font-black text-white mt-0.5">{isOnline ? dev.heartbeatsCount : '--'}</p>
                    </div>
                  </div>

                  {/* 额外连接指标 (RTT/通信) */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 px-1 uppercase tracking-wide">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      安全校验链路: {isOnline ? '极强' : '未连接'}
                    </span>
                    <span>
                      延迟 (RTT): <span className="font-mono text-white text-xs">{isOnline ? `${dev.rtt} ms` : '--'}</span>
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 pb-3 bg-zinc-950/40 flex justify-end">
                  <Button
                    onClick={() => handlePing(dev.id, dev.name)}
                    disabled={isPinging || !isOnline}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold h-8 px-4 rounded-xl border border-zinc-700/30 flex items-center gap-1.5 transition-all active:scale-97"
                  >
                    {isPinging ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                        探测连接中...
                      </>
                    ) : (
                      <>
                        <Power className="w-3 h-3 text-emerald-400" />
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
    </div>
  );
}

