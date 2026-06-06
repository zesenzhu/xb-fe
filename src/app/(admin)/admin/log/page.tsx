'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Select, Space, Tag, message, Card } from 'antd';
import { Terminal, Search, Trash2, ArrowDown, Cpu, Play, Square, History } from 'lucide-react';
import { api } from '@/lib/axios';

interface LogLine {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  module: string;
  content: string;
}

interface RegisterCodeOption {
  id: string;
  code: string;
  deviceId: string | null;
  status: string;
}

export default function LogPage() {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [codeOptions, setCodeOptions] = useState<RegisterCodeOption[]>([]);
  
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'realtime' | 'history'>('realtime');
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // 1. 初始化拉取所有注册码，供下拉菜单快捷选择
  useEffect(() => {
    const loadCodes = async () => {
      try {
        const response: any = await api.get('/register-codes', {
          params: { page: 1, limit: 100 },
        });
        const list = response.list || [];
        setCodeOptions(list);
      } catch (err: any) {
        message.error('加载注册码选项失败');
      }
    };
    loadCodes();
  }, []);

  // 当选择不同注册码时，如果它绑定了设备，自动填入设备 ID
  const handleCodeSelect = (codeText: string) => {
    setSelectedCode(codeText);
    const matched = codeOptions.find(o => o.code === codeText);
    if (matched && matched.deviceId) {
      setSelectedDeviceId(matched.deviceId);
    } else {
      setSelectedDeviceId('');
    }
  };

  // 2. 建立 SSE 实时日志通道
  const startMonitoring = () => {
    if (!selectedCode || !selectedDeviceId) {
      message.warning('请先选择或输入注册码和设备ID！');
      return;
    }

    // 清空现有终端
    setLogs([]);
    setViewMode('realtime');

    // 关闭上一个连接 (以防万一)
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';
    const sseUrl = `${apiBase}/logs/stream?deviceId=${selectedDeviceId}&code=${selectedCode}`;

    message.loading({ content: '正在尝试连接设备长通道...', key: 'monitor_conn' });

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      message.success({ content: '连接通道成功！设备日志开始按需上报中...', key: 'monitor_conn', duration: 2 });
      setIsMonitoring(true);
    };

    es.onmessage = (event) => {
      try {
        const freshLog = JSON.parse(event.data);
        setLogs((prev) => {
          // 限制内存缓冲区只保留最新 300 行
          const newArray = [...prev, freshLog];
          if (newArray.length > 300) {
            return newArray.slice(newArray.length - 300);
          }
          return newArray;
        });
      } catch (err) {
        console.error('解析实时日志帧出错', err);
      }
    };

    es.onerror = () => {
      message.error({ content: '实时日志流通道已断开。可能原因：设备离线或服务重启。', key: 'monitor_conn' });
      stopMonitoring();
    };
  };

  // 关闭监控通道
  const stopMonitoring = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsMonitoring(false);
    message.info('已停止实时监控上报，设备恢复本地缓存模式');
  };

  // 离开页面时强制清理长连接
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // 3. 拉取 PostgreSQL 历史归档日志
  const loadHistoryLogs = async () => {
    if (!selectedCode) {
      message.warning('请选择要查询的注册码！');
      return;
    }

    if (isMonitoring) {
      stopMonitoring();
    }

    setViewMode('history');
    setLogs([]);

    const matched = codeOptions.find(o => o.code === selectedCode);
    const codeId = matched ? matched.id : undefined;

    try {
      message.loading({ content: '正在加载历史归档记录...', key: 'history_load' });
      const response: any = await api.get('/logs/history', {
        params: {
          page: 1,
          limit: 100,
          registerCodeId: codeId,
          deviceId: selectedDeviceId || undefined,
          level: levelFilter,
        }
      });
      
      const list = response.list || [];
      // 历史日志通常是从新到旧，为了终端正常排版滚动，我们将其反转，由旧到新呈现
      setLogs(list.reverse());
      message.success({ content: `成功加载 ${list.length} 条历史日志！`, key: 'history_load', duration: 2 });
    } catch (err: any) {
      message.error({ content: err.message || '加载历史日志失败', key: 'history_load' });
    }
  };

  // 自动滚动到 Terminal 底部
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClear = () => {
    setLogs([]);
    message.success('本地终端视图已清空');
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
          <h1 className="text-xl font-black">脚本运行日志终端</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            诊断行为树执行链路、自动捕获 JS 脚本异常、监控 MQTT 数据帧推送与网络抖动
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            danger
            onClick={handleClear}
            className="flex items-center gap-1 text-xs h-9 dark:bg-zinc-900 border-rose-200 hover:border-rose-500"
          >
            <Trash2 className="w-4 h-4" />
            清空终端
          </Button>
        </div>
      </div>

      {/* 控制中心：连通性与查询配置 */}
      <Card className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">1. 选择注册码 (激活状态)</label>
              <Select
                showSearch
                placeholder="请选择或输入授权注册码..."
                value={selectedCode || undefined}
                onChange={handleCodeSelect}
                className="w-full h-9"
                options={codeOptions.map(o => ({
                  value: o.code,
                  label: `${o.code} (${o.deviceId ? '绑定中' : '未激活'})`,
                }))}
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">2. 绑定设备ID (长连接对应)</label>
              <Input
                placeholder="请填入客户端设备ID..."
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="h-9 border-slate-200 dark:border-zinc-800"
                prefix={<Cpu className="w-4 h-4 text-slate-400" />}
                allowClear
              />
            </div>

            <div className="flex gap-2">
              {!isMonitoring ? (
                <Button
                  type="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 font-bold text-xs h-9 flex-1 flex items-center justify-center gap-1"
                  onClick={startMonitoring}
                >
                  <Play className="w-4 h-4" />
                  开启实时日志
                </Button>
              ) : (
                <Button
                  danger
                  type="primary"
                  className="font-bold text-xs h-9 flex-1 flex items-center justify-center gap-1"
                  onClick={stopMonitoring}
                >
                  <Square className="w-4 h-4" />
                  停止监控
                </Button>
              )}

              <Button
                className="font-bold text-xs h-9 flex-1 flex items-center justify-center gap-1 border-slate-200 dark:border-zinc-800"
                onClick={loadHistoryLogs}
              >
                <History className="w-4 h-4 text-indigo-500" />
                查询历史日志
              </Button>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-zinc-800 w-full" />

          {/* 筛选过滤工具 */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Select
                value={levelFilter}
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
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="按关键字/来源模块过滤当前视图..."
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
              {isMonitoring ? (
                <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  实时监控中 ({selectedDeviceId})
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  通道静默
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Terminal 黑底日志视窗 */}
      <div className="bg-slate-950 dark:bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* 终端顶部栏 */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono font-bold text-slate-400 ml-2 flex items-center gap-1">
              <Terminal className="w-4 h-4 text-emerald-400" />
              xbnestjs-client-shell [{viewMode === 'realtime' ? 'REALTIME_STREAM' : 'DATABASE_HISTORY'}]
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-600">
            TTY: /dev/pts/2
          </span>
        </div>

        {/* 日志内容滚动区 */}
        <div className="p-4 h-[480px] overflow-y-auto font-mono text-xs leading-relaxed space-y-2 select-text custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm gap-2 select-none">
              <Terminal className="w-8 h-8 opacity-40 animate-pulse" />
              <span>没有找到符合搜索条件的日志项，或尚未开启日志流。</span>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
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
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
