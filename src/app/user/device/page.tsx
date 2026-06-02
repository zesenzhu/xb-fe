'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, Power, Activity, Thermometer, ShieldCheck, Heart, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const mockClientDevices: ClientDevice[] = [
  { id: 'dev-1', name: 'MY-HOME-AGENT-01', ip: '192.168.1.108', status: 'online', temperature: 38, cpuLoad: 18.5, rtt: 12, licenseBound: 'SEC-8902A39E1', heartbeatsCount: 1420 },
  { id: 'dev-2', name: 'MY-SIMULATOR-NODE-02', ip: '172.20.14.88', status: 'online', temperature: 45, cpuLoad: 68.0, rtt: 25, licenseBound: 'SEC-8902A39E1', heartbeatsCount: 980 },
];

export default function UserDevicePage() {
  const [devices, setDevices] = useState<ClientDevice[]>(mockClientDevices);
  const [pingingMap, setPingingMap] = useState<Record<string, boolean>>({});

  const handlePing = (id: string, name: string) => {
    setPingingMap((prev) => ({ ...prev, [id]: true }));
    
    // 模拟下发 MQTT 物理 ping 并等待响应延迟的动态效果
    setTimeout(() => {
      setPingingMap((prev) => ({ ...prev, [id]: false }));
      
      // 随机波动一下 RTT 延迟展现真实感
      setDevices((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, rtt: Math.floor(Math.random() * 20) + 8, heartbeatsCount: d.heartbeatsCount + 1 }
            : d
        )
      );

      toast.success(`设备 [ ${name} ] 心跳探测响应成功，信道 RTT 往返完好！`);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 标头 */}
      <div>
        <h1 className="text-lg font-black text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          我的端侧设备列表
        </h1>
        <p className="text-[11px] text-zinc-500 font-semibold mt-1">
          当前受监控端侧自研硬件，仅展示与您的注册激活码绑定的私有设备数据
        </p>
      </div>

      {/* 设备网格列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {devices.map((dev) => {
          const isOnline = dev.status === 'online';
          const isPinging = pingingMap[dev.id];

          return (
            <Card key={dev.id} className="border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
              
              {/* 右上角发光在线点 */}
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
                
                {/* 硬件运行健康指标 */}
                <div className="grid grid-cols-3 gap-2 text-center select-none">
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900/60">
                    <Thermometer className="w-3.5 h-3.5 mx-auto text-amber-500" />
                    <p className="text-[9px] text-zinc-500 font-extrabold uppercase mt-1">CPU 温度</p>
                    <p className="text-sm font-black text-white mt-0.5">{dev.temperature} °C</p>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900/60">
                    <Activity className="w-3.5 h-3.5 mx-auto text-sky-500 animate-pulse" />
                    <p className="text-[9px] text-zinc-500 font-extrabold uppercase mt-1">CPU 负载</p>
                    <p className="text-sm font-black text-white mt-0.5">{dev.cpuLoad} %</p>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900/60">
                    <Heart className="w-3.5 h-3.5 mx-auto text-pink-500" />
                    <p className="text-[9px] text-zinc-500 font-extrabold uppercase mt-1">物理心跳数</p>
                    <p className="text-sm font-black text-white mt-0.5">{dev.heartbeatsCount}</p>
                  </div>
                </div>

                {/* 额外连接指标 (RTT/通信) */}
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 px-1 uppercase tracking-wide">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    安全校验链路: 极强
                  </span>
                  <span>
                    延迟 (RTT): <span className="font-mono text-white text-xs">{dev.rtt} ms</span>
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
                      心跳探测中...
                    </>
                  ) : (
                    <>
                      <Power className="w-3 h-3 text-emerald-400" />
                      发送保活心跳
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
