'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Select, Space, Tag, message } from 'antd';
import { Terminal, Search, Trash2, ArrowDown, ShieldAlert, Cpu } from 'lucide-react';

interface LogLine {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  module: string;
  content: string;
}

// 模拟滚动更新的数据流日志
const initialLogs: LogLine[] = [
  { id: '1', time: '14:45:01', level: 'INFO', module: 'SCRIPT_ENGINE', content: '行为树引擎引导初始化完成，当前挂载节点: baichuan-robot-core' },
  { id: '2', time: '14:45:03', level: 'INFO', module: 'MQTT_CLIENT', content: '成功与 MQTT 代理端建立 TCP 通信物理链路 (emqx-agent-broker:1883)' },
  { id: '3', time: '14:45:10', level: 'WARN', module: 'FLOW_CONTROLLER', content: '触发限流防护：发现短时高频心跳调用请求，自动将 QPS 调整为 5' },
  { id: '4', time: '14:45:15', level: 'INFO', module: 'AI_SERVICE', content: 'AI 推理代理准备绪，载入模型配置: DeepSeek-R1-Distill-Q4' },
  { id: '5', time: '14:45:22', level: 'ERROR', module: 'EXECUTOR', content: '自动化行为脚本 executor.js 执行出错，堆栈定位: L103 (TypeError: Cannot read properties of undefined)' },
  { id: '6', time: '14:45:30', level: 'INFO', module: 'DEVICE_MONITOR', content: '设备 DEV-9082 自检报告: 温度 38°C，硬件 CPU 负载 28.5%，内存余量 72%' },
  { id: '7', time: '14:45:41', level: 'WARN', module: 'MQTT_CLIENT', content: 'MQTT 心跳帧延迟返回: 当前网络波动抖动值达到 120ms' },
  { id: '8', time: '14:45:50', level: 'ERROR', module: 'DATABASE_ORM', content: 'Prisma Client 读操作失败: 发现 PostgreSQL 数据库物理连接池占满 (Max pool reached: 20)' },
];

export default function LogPage() {
  const [logs, setLogs] = useState<LogLine[]>(initialLogs);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // 模拟脚本产生动态实时日志流的效果 (呼吸感)
  useEffect(() => {
    const timer = setInterval(() => {
      const newLogTime = new Date().toTimeString().split(' ')[0];
      const pool = [
        { level: 'INFO' as const, module: 'DEVICE_MONITOR', content: '运行报告: 行为树主节点成功完成一个循环Tick运算 (0ms耗时)' },
        { level: 'WARN' as const, module: 'FLOW_CONTROLLER', content: '高频警告: 端侧设备请求频次逼近限流临界值 (18 Req/Sec)' },
        { level: 'INFO' as const, module: 'AI_SERVICE', content: 'Agent 对话调度完毕，生成流式推理响应 (累计消耗: 142 Tokens)' },
        { level: 'ERROR' as const, module: 'EXECUTOR', content: '行为动作引擎发生物理阻塞: 远程重置指令下发超时，端侧响应失效' },
      ];
      
      const select = pool[Math.floor(Math.random() * pool.length)];
      
      const freshLog: LogLine = {
        id: Math.random().toString(),
        time: newLogTime,
        ...select,
      };

      setLogs((prev) => [...prev.slice(-99), freshLog]); // 保留最大 100 行日志
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  // 自动滚动到 Terminal 底部
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClear = () => {
    setLogs([]);
    message.success('本地缓存终端日志已清空');
  };

  // 根据级别与模糊关键字联合过滤
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesSearch =
      searchQuery === '' ||
      log.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">脚本运行日志检索面板</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            诊断行为树执行链路、自动捕获 JS 脚本异常、监控 MQTT 数据帧推送与网络抖动
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            danger
            variant="dashed"
            size="small"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs h-9 dark:bg-zinc-900"
          >
            <Trash2 className="w-4 h-4" />
            清空终端
          </Button>
        </div>
      </div>

      {/* 高级控制工具栏 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* 告警等级过滤 */}
          <Select
            defaultValue="ALL"
            style={{ width: 140 }}
            onChange={(val) => setLevelFilter(val)}
            className="h-9 w-full sm:w-auto"
            options={[
              { value: 'ALL', label: '全部告警等级' },
              { value: 'INFO', label: 'INFO (正常日志)' },
              { value: 'WARN', label: 'WARN (异常警告)' },
              { value: 'ERROR', label: 'ERROR (致命错误)' },
            ]}
          />
          {/* 日志来源输入框 */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="按关键字/来源模块检索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-slate-200 dark:border-zinc-800"
              allowClear
            />
          </div>
        </div>

        {/* 自动滚动开关与状态点缀 */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <Button
            variant={autoScroll ? "solid" : "outlined"}
            onClick={() => setAutoScroll(!autoScroll)}
            className="text-xs h-9 flex items-center gap-1"
          >
            <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
            {autoScroll ? '自动滚动已锁定' : '自动滚动已关闭'}
          </Button>
          <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800" />
          <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            实时监控中 (已检索 {filteredLogs.length} 条)
          </span>
        </div>
      </div>

      {/* 3. 极炫高对比 Terminal 黑底日志视窗 */}
      <div className="bg-slate-950 dark:bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* 终端顶部栏 */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            {/* 三色红绿黄控制球点缀 */}
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono font-bold text-slate-400 ml-2 flex items-center gap-1">
              <Terminal className="w-4 h-4 text-emerald-400" />
              xbnestjs-executor-shell
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-600">
            TTY: /dev/pts/1
          </span>
        </div>

        {/* 日志内容滚动区 */}
        <div className="p-4 h-[450px] overflow-y-auto font-mono text-xs leading-relaxed space-y-2 select-text custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm gap-2 select-none">
              <Terminal className="w-8 h-8 opacity-40 animate-pulse" />
              <span>没有找到符合搜索条件的日志项</span>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              // 颜色差异渲染
              let levelColor = 'text-sky-400';
              let lineClass = 'text-slate-300';
              
              if (log.level === 'ERROR') {
                levelColor = 'text-red-500 bg-red-950/40 px-1 border border-red-900/30 rounded font-black';
                lineClass = 'text-red-400 bg-red-950/10 font-bold';
              } else if (log.level === 'WARN') {
                levelColor = 'text-amber-500 font-bold';
                lineClass = 'text-amber-300';
              }

              return (
                <div key={log.id} className={`flex items-start gap-3 py-1 px-1.5 rounded transition-colors duration-100 hover:bg-slate-900/40 ${lineClass}`}>
                  {/* 行号 */}
                  <span className="text-slate-700 w-8 text-right select-none text-[10px]">
                    {(index + 1).toString().padStart(3, '0')}
                  </span>
                  
                  {/* 时间 */}
                  <span className="text-slate-500 select-none">
                    [{log.time}]
                  </span>

                  {/* 告警等级 */}
                  <span className={`w-14 shrink-0 font-bold tracking-wider text-center ${levelColor}`}>
                    {log.level}
                  </span>

                  {/* 来源模块 */}
                  <span className="text-indigo-400 font-bold shrink-0">
                    [{log.module}]
                  </span>

                  {/* 具体描述 */}
                  <span className="flex-1 whitespace-pre-wrap select-all font-semibold">
                    {log.content}
                  </span>
                </div>
              );
            })
          )}
          {/* 滚动锁定定位锚点 */}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
