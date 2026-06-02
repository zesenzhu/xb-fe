'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // 仅用轻量 CSS 还原即可，或者用 HTML 原生标签
import { Timeline, Tag } from 'antd'; // 引用轻量 antd 时间轴
import { History, Sparkles, Brain, Cpu, Bot, CheckCircle2, ChevronRight } from 'lucide-react';

interface AiRecordItem {
  id: string;
  time: string;
  prompt: string;
  model: string;
  tokensUsed: number;
  actionTaken: string; // 调度的物理工具指令
  status: 'completed' | 'failed';
}

const mockAiRecords: AiRecordItem[] = [
  {
    id: 'rec-1',
    time: '2026-06-02 14:35:10',
    prompt: '检查我的设备，发现过热时自动重启它',
    model: 'DeepSeek-R1',
    tokensUsed: 1420,
    actionTaken: 'publish("payload/cmd/REBOOT", { device: "BAICHUAN-ROBOT-02" })',
    status: 'completed',
  },
  {
    id: 'rec-2',
    time: '2026-06-01 10:12:45',
    prompt: '生成两个最大激活次数为 1、QPS 限制为 5 的测试注册码',
    model: 'DeepSeek-V3',
    tokensUsed: 980,
    actionTaken: 'create_license({ count: 2, limit: 5, activations: 1 })',
    status: 'completed',
  },
  {
    id: 'rec-3',
    time: '2026-05-30 18:22:04',
    prompt: '分析最近 3 小时脚本报错日志，告诉我出现最多的是哪个模块',
    model: 'Claude-3.5-Sonnet',
    tokensUsed: 2200,
    actionTaken: 'query_logs({ hours: 3, level: "ERROR" })',
    status: 'completed',
  },
];

export default function UserAiRecordPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 标头 */}
      <div>
        <h1 className="text-lg font-black text-white flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          AI Agent 任务回溯历史
        </h1>
        <p className="text-[11px] text-zinc-500 font-semibold mt-1">
          记录您与 AI Agent 对话下发的物理自适应指令以及端侧工具（Action Tools）调度详情
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左侧：时间轴概览 (占 2 栏) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider select-none">任务时序时间轴</h3>
          <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-2xl p-6">
            <Timeline
              className="font-medium text-xs dark-timeline"
              items={mockAiRecords.map((rec) => ({
                color: rec.status === 'completed' ? 'green' : 'red',
                children: (
                  <div className="pb-6 select-text">
                    {/* 头部：时间与状态 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-zinc-500 font-bold font-mono">{rec.time}</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-950/30 text-emerald-400 border border-emerald-900/20 uppercase">
                        {rec.status === 'completed' ? '成功' : '失败'}
                      </span>
                    </div>

                    {/* 用户自然语言 Prompt */}
                    <p className="text-xs text-white font-bold mt-2 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      &ldquo;{rec.prompt}&rdquo;
                    </p>

                    {/* 物理工具 Action */}
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900/60 font-mono text-[10px] text-indigo-400 mt-2.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                      <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="font-bold">工具调度:</span>
                      <span className="text-zinc-300 font-semibold">{rec.actionTaken}</span>
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        </div>

        {/* 右侧：统计概览卡片 (占 1 栏) */}
        <div className="lg:col-span-1 space-y-4 select-none">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Agent 额度看板</h3>
          <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-emerald-400" />
                模型消耗累计
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 text-xs">
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-800/40">
                <span className="text-zinc-400 font-semibold">累计任务指令:</span>
                <span className="text-white font-black text-sm">3 个</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-800/40">
                <span className="text-zinc-400 font-semibold">首选决策模型:</span>
                <span className="text-white font-black text-sm font-mono text-indigo-400">DeepSeek-R1</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-zinc-800/40">
                <span className="text-zinc-400 font-semibold">消耗 Token 额度:</span>
                <span className="text-white font-black text-sm">4,600 Tokens</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-zinc-400 font-semibold">额度健康判定:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px] uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  正常运行 (VIP)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
