'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  KeyRound,
  Cpu,
  Bot,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
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

// Mock 仪表盘基础卡片数据
const cardData = [
  {
    title: '系统用户总数',
    value: '1,248 人',
    description: '较上周新增 +12%',
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
  },
  {
    title: '激活注册码',
    value: '3,842 个',
    description: '全系统激活率高达 94.2%',
    icon: KeyRound,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  {
    title: 'MQTT设备状态',
    value: '142 / 150 台',
    description: '当前在线率 94.6%',
    icon: Cpu,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    pulse: true, // 启用在线绿色呼吸灯
  },
  {
    title: 'AI 调用 Token 数',
    value: '1,248,500 条',
    description: '本月调用额度 较上月 -3.4%',
    icon: Bot,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
  },
];

// Mock 图表 1: 设备负载与日志报错趋势
const trendData = [
  { time: '00:00', 脚本报错: 4, 设备负载: 30, AI调用: 20 },
  { time: '04:00', 脚本报错: 2, 设备负载: 25, AI调用: 10 },
  { time: '08:00', 脚本报错: 15, 设备负载: 65, AI调用: 85 },
  { time: '12:00', 脚本报错: 22, 设备负载: 80, AI调用: 120 },
  { time: '16:00', 脚本报错: 8, 设备负载: 55, AI调用: 90 },
  { time: '20:00', 脚本报错: 12, 设备负载: 70, AI调用: 110 },
  { time: '24:00', 脚本报错: 5, 设备负载: 40, AI调用: 45 },
];

// Mock 图表 2: AI Agent 耗时与消耗统计
const modelData = [
  { name: 'DeepSeek-V3', 'tokens(k)': 400, '耗时(ms)': 450 },
  { name: 'DeepSeek-R1', 'tokens(k)': 320, '耗时(ms)': 1200 },
  { name: 'GPT-4o', 'tokens(k)': 280, '耗时(ms)': 600 },
  { name: 'Claude-3.5', 'tokens(k)': 180, '耗时(ms)': 850 },
];

// Mock 最新系统运行告警日志
const recentLogs = [
  { id: '1', level: 'ERROR', message: 'MQTT 异常断开: 客户端 ID device_mac_08A3 发生保活超时 (PingResp 未收到)', time: '14:42:01', device: 'DEVICE-01' },
  { id: '2', level: 'WARN', message: '注册激活管控: 激活码 SEC-80321F5 进行异常高频调用拦截 (IP: 182.92.112.5)', time: '14:40:12', device: 'WEB-API' },
  { id: '3', level: 'ERROR', message: '脚本引擎崩溃: 自动化刷怪脚本 executor.js 发生致命语法引用溢出 (NullPointer)', time: '14:38:55', device: 'DEVICE-03' },
  { id: '4', level: 'INFO', message: 'AI 控制台: 模型参数热重载完毕，当前并发上限已设置为 20 QPS', time: '14:35:10', device: 'AI-AGENT' },
];

export default function DashboardPage() {
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
          <Button variant="outline" size="sm" className="text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900">
            查看详情
          </Button>
          <Button size="sm" className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 flex items-center gap-1">
            数据导出
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 1. 四大核心指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cardData.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-2xl font-black tracking-tight flex items-center gap-2">
                  {card.value}
                  {card.pulse && (
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
                {recentLogs.map((log) => (
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
