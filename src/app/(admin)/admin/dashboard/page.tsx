'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  KeyRound,
  Cpu,
  Bot,
  TrendingUp,
  ArrowUpRight,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { api } from '@/lib/axios';

// 核心指标卡片的 Lucide 图标与样式映射配置
const cardConfigs: Record<string, { icon: any; color: string; bg: string; pulse?: boolean }> = {
  userCount: {
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
  },
  activeCodes: {
    icon: KeyRound,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  onlineDevices: {
    icon: Cpu,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    pulse: true,
  },
  aiTokens: {
    icon: Bot,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const res: any = await api.get('/dashboard/overview');
      setData(res);
    } catch (err) {
      console.error('[Dashboard] 无法拉取仪表盘监控指标:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // 每 10 秒轮询拉取最新数据，保持仪表盘数据的实时更新
    const timer = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(timer);
  }, []);

  // 1. 骨架屏加载过渡，极致 premium 的用户体验
  if (loading && !data) {
    return (
      <div className="space-y-6 select-none">
        {/* 顶部标题骨架屏 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-slate-100 dark:bg-zinc-800/80 rounded w-80 animate-pulse"></div>
          </div>
        </div>

        {/* 四大指标卡片骨架屏 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-24"></div>
                <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-zinc-800"></div>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded w-24"></div>
                <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 图表骨架屏 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm h-[360px] animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-5 bg-slate-200 dark:bg-zinc-800 rounded w-60"></div>
              <div className="h-3 bg-slate-100 dark:bg-zinc-850 rounded w-96"></div>
            </CardHeader>
            <CardContent className="h-[250px] flex items-center justify-center p-6">
              <div className="w-full h-full bg-slate-50 dark:bg-zinc-850/50 rounded-lg"></div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm h-[360px] animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-5 bg-slate-200 dark:bg-zinc-800 rounded w-40"></div>
              <div className="h-3 bg-slate-105 dark:bg-zinc-850 rounded w-60"></div>
            </CardHeader>
            <CardContent className="h-[250px] flex items-center justify-center p-6">
              <div className="w-full h-full bg-slate-50 dark:bg-zinc-850/50 rounded-lg"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 兜底空状态，如果接口出错
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <p className="text-sm">暂未拉取到监控大屏数据，请检查后端服务是否启动正常。</p>
        <Button onClick={fetchDashboardData} className="mt-4 text-xs font-semibold">
          重新拉取
        </Button>
      </div>
    );
  }

  const { cards, trendData, modelData, recentLogs } = data;

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      
      {/* 顶部标题与快速动作区 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">系统控制面板</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            实时监控您的 NestJS 设备层、注册激活、AI 对话代理和运行日志
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchDashboardData} variant="outline" size="sm" className="text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900">
            手动刷新
          </Button>
          <Button size="sm" className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 flex items-center gap-1">
            数据导出
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 1. 四大核心指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card: any) => {
          const config = cardConfigs[card.key] || { icon: Bot, color: 'text-slate-600', bg: 'bg-slate-50' };
          const Icon = config.icon;

          return (
            <Card key={card.title} className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-2xl font-black tracking-tight flex items-center gap-2">
                  {card.value}
                  {config.pulse && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold mt-2.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 2. Recharts 统计图表大区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左侧：报错与负载趋势 (占 2 栏) */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-tight">脚本运行状态及日志报错趋势</CardTitle>
            <CardDescription className="text-xs">
              实时监测每 4 小时的设备硬件平均负载率以及脚本告警数量
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="loadColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="errorColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-zinc-800" />
                <XAxis dataKey="time" stroke="#94a3b8" className="text-[10px]" />
                <YAxis stroke="#94a3b8" className="text-[10px]" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Legend className="text-xs mt-2" />
                <Area type="monotone" dataKey="设备负载" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#loadColor)" name="设备平均负载 (%)" />
                <Area type="monotone" dataKey="脚本报错" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#errorColor)" name="告警日志条数" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 右侧：AI Agent 调用分布 (占 1 栏) */}
        <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold tracking-tight">AI Agent 模型调用消耗</CardTitle>
            <CardDescription className="text-xs">
              各大主流端侧推理模型的调用规模与响应延迟对比
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-zinc-800" />
                <XAxis dataKey="name" stroke="#94a3b8" className="text-[9px] font-semibold" />
                <YAxis stroke="#94a3b8" className="text-[10px]" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Legend className="text-xs" />
                <Bar dataKey="tokens(k)" fill="#10b981" radius={[4, 4, 0, 0]} name="Token 数量 (千)" />
                <Bar dataKey="耗时(ms)" fill="#f59e0b" radius={[4, 4, 0, 0]} name="延迟响应 (毫秒)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 3. 底层：最新运行警报日志列表 */}
      <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold tracking-tight flex items-center gap-1.5">
              <Terminal className="w-4.5 h-4.5 text-red-500" />
              最新异常诊断中心
            </CardTitle>
            <CardDescription className="text-xs">
              设备 MQTT 交互链路与行为脚本引擎发生的最新异常诊断报告
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-xs hover:bg-slate-100 dark:hover:bg-zinc-800">
            全部日志
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 pb-3 text-slate-500 dark:text-zinc-400 text-xs">
                  <th className="py-2.5 font-bold">告警级别</th>
                  <th className="py-2.5 font-bold">错误时间</th>
                  <th className="py-2.5 font-bold">来源模块</th>
                  <th className="py-2.5 font-bold">告警描述</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                {recentLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        log.level === 'ERROR'
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                          : log.level === 'WARN'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
                          : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          log.level === 'ERROR' ? 'bg-red-500' : log.level === 'WARN' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs font-semibold text-slate-400 dark:text-zinc-500">{log.time}</td>
                    <td className="py-3 pr-4 text-xs font-bold text-slate-700 dark:text-zinc-300">{log.device}</td>
                    <td className="py-3 font-medium text-slate-600 dark:text-zinc-400 max-w-md truncate">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

