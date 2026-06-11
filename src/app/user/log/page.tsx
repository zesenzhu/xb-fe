'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { List } from 'react-window';
import {
  Terminal,
  Play,
  Pause,
  Download,
  Search,
  ArrowDown,
  Activity,
  Wifi,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUserStore } from '@/store/useUserStore';
import { api } from '@/lib/axios';

interface LogLine {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  module: string;
  content: string;
}

export default function UserLogPage() {
  const { user } = useUserStore();
  const code = user?.username; // 注册激活码文本

  interface DeviceItem {
    id: string;
    name: string;
    ip: string;
    status: 'online' | 'offline';
  }

  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [devicesList, setDevicesList] = useState<DeviceItem[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isLive, setIsLive] = useState(true); // 是否实时接收日志流
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(480);

  // 1. 动态监听容器大小，保证高度在移动端与折叠状态下自适应
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      if (controlsCollapsed) {
        // 折叠控制栏后，大幅拉升日志视窗高度
        setListHeight(isMobile ? 540 : 640);
      } else {
        setListHeight(isMobile ? 380 : 480);
      }
    };

    handleResize(); // 挂载时立即调用一次
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [controlsCollapsed]);

  // 1.5 定期拉取授权码绑定的物理设备列表
  useEffect(() => {
    if (!code) return;

    const fetchDevices = async () => {
      try {
        const response: any = await api.get('/register-codes/my-devices', {
          params: { code },
        });
        const list = response || [];
        setDevicesList(list);

        // 自动选择默认设备 ID
        setActiveDeviceId((current) => {
          if (list.length > 0) {
            const exists = list.some((d: any) => d.id === current);
            // 如果当前选择的不在物理列表内，或者当前的只是默认的浏览器大屏设备，则自动切为第一个物理设备
            if (!exists || current === user?.deviceId) {
              return list[0].id;
            }
            return current;
          }
          return current || user?.deviceId || '';
        });
      } catch (err) {
        console.error('[Logs] 获取绑定的设备列表失败:', err);
      }
    };

    fetchDevices();
    const interval = setInterval(fetchDevices, 8000); // 每 8 秒轮询一次
    return () => clearInterval(interval);
  }, [code, user?.deviceId]);

  // 2. 真实接入后端历史日志接口
  useEffect(() => {
    const fetchHistory = async () => {
      if (!activeDeviceId) return;
      try {
        const response: any = await api.get('/logs/history', {
          params: {
            deviceId: activeDeviceId,
            level: levelFilter,
            page: 1,
            limit: 100, // 默认拉取最新的 100 条历史日志
          },
        });
        if (response && response.list) {
          // 后端返回是时间倒序的（最新在最前），展示时我们需要将其反转为正序（最老在最前，最新在尾部）
          const sortedHistory = [...response.list].reverse();
          setLogs(sortedHistory);
        }
      } catch (err: any) {
        console.error('[Logs] 无法拉取历史归档日志:', err);
      }
    };

    fetchHistory();
  }, [activeDeviceId, levelFilter]);

  // 3. 真实接入 SSE (Server-Sent Events) 推送接口
  useEffect(() => {
    if (!isLive || !activeDeviceId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';
    const sseUrl = `${apiUrl}/logs/stream?deviceId=${activeDeviceId}&code=${code || ''}`;
    
    console.log('[SSE] 正在建立实时日志流连接:', sseUrl);
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const logData = JSON.parse(event.data);
        const freshLog: LogLine = {
          id: logData.id || Math.random().toString(),
          time: logData.time || new Date().toTimeString().split(' ')[0],
          level: logData.level || 'INFO',
          module: logData.module || 'CLIENT',
          content: logData.content || logData.message || '',
        };

        setLogs((prev) => {
          // 为防行数溢出撑爆内存，强制限制内存最大缓存 3000 行
          const next = [...prev, freshLog];
          if (next.length > 3000) {
            return next.slice(-3000);
          }
          return next;
        });
      } catch (e) {
        console.error('[SSE] 解析日志载荷包失败:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('[SSE] 日志推送流连接发生断开或重连波动:', err);
    };

    return () => {
      console.log('[SSE] 关闭实时日志流连接');
      eventSource.close();
    };
  }, [isLive, activeDeviceId, code]);

  // 4. 关键字联合过滤 (配合级联级别的过滤)
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesSearch =
      searchQuery === '' ||
      log.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  // 5. 自动滚动锁定
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, filteredLogs.length]);

  // 6. 导出本地日志文件下载
  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('当前无终端日志可导出');
      return;
    }

    const logText = logs
      .map((log) => `[${log.time}] [${log.level}] [${log.module}]: ${log.content}`)
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xbnets_terminal_${activeDeviceId || 'device'}_${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('本地运行日志已成功导出');
  };

  return (
    <div className="space-y-4 select-none">
      
      {/* 1. 面板标题头与折叠控制开关 */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
          <h1 className="text-sm sm:text-base font-black text-white">
            用户端实时运行终端
          </h1>
          {controlsCollapsed && (
            <span className="text-[9px] bg-zinc-900 border border-zinc-800/60 px-1.5 py-0.5 rounded text-zinc-500 font-extrabold uppercase animate-in fade-in duration-200">
              已收起控制栏
            </span>
          )}
        </div>
        
        {/* 折叠切换按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setControlsCollapsed(!controlsCollapsed)}
          className="text-[11px] font-bold gap-1 h-7 px-2 sm:px-2.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white"
        >
          {controlsCollapsed ? (
            <>
              展开控制
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              收起控制
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </div>

      {/* 2. 可被折叠的控制按钮与过滤器面板 */}
      {!controlsCollapsed && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {/* 数据导出与暂停按钮 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-zinc-500 font-semibold hidden sm:block">
                已建立与 NestJS 高并发日志物理通道的连接，集成了高性能虚拟化渲染
              </p>
            </div>
            
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <Button
                variant={isLive ? "default" : "outline"}
                onClick={() => setIsLive(!isLive)}
                className={cn(
                  "text-[11px] font-bold gap-1.5 h-8.5 px-3 rounded-xl transition-all active:scale-97 border-zinc-800",
                  isLive ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 hover:text-zinc-950 shadow-lg shadow-emerald-500/10" : "bg-zinc-900 text-zinc-300"
                )}
              >
                {isLive ? (
                  <>
                    <Pause className="w-3 h-3" />
                    暂停实时更新
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    恢复实时更新
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleExport}
                className="text-[11px] font-bold gap-1.5 h-8.5 px-3 rounded-xl bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <Download className="w-3 h-3" />
                导出日志
              </Button>
            </div>
          </div>

          {/* 高级联合检索过滤器 - 移动端极致布局 */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-2.5 sm:p-4 flex flex-col md:flex-row gap-2.5 sm:gap-4 items-center justify-between shadow-lg">
            {/* 左侧筛选与搜索 - 移动端并排 */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={levelFilter}
                onChange={(e: any) => setLevelFilter(e.target.value)}
                className="h-9 px-2 w-1/2 sm:w-36 bg-zinc-950 border border-zinc-800 text-xs rounded-xl focus:outline-none focus:border-zinc-700 font-bold"
              >
                <option value="ALL">全部告警等级</option>
                <option value="INFO">INFO (正常自检)</option>
                <option value="WARN">WARN (异常波动)</option>
                <option value="ERROR">ERROR (致命故障)</option>
              </select>
              
              <div className="relative w-1/2 sm:w-56">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-600" />
                <Input
                  placeholder="关键字检索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 h-9 bg-zinc-950 border-zinc-800 text-white text-xs placeholder-zinc-700 focus-visible:ring-emerald-500/25 rounded-xl"
                />
              </div>
            </div>

            {/* 右侧自动滚动定位与行数 - 移动端横向紧凑分布 */}
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto border-t border-zinc-800/30 pt-2.5 md:pt-0 md:border-0">
              <Button
                variant="ghost"
                onClick={() => setAutoScroll(!autoScroll)}
                className={cn(
                  "text-[10px] h-7 font-bold border rounded-xl px-2.5 transition-colors",
                  autoScroll
                    ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400"
                    : "bg-zinc-950 border-zinc-800 text-zinc-500"
                )}
              >
                <ArrowDown className={cn("w-3 h-3 mr-1", autoScroll && 'animate-bounce')} />
                {autoScroll ? '锁定尾部' : '开启滚屏'}
              </Button>
              <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
              <span className="text-[10px] text-zinc-500 font-extrabold flex items-center gap-1.5 uppercase select-text">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                缓冲区: {filteredLogs.length} 行
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. 极速 react-window 虚拟列表大屏 */}

      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Terminal Header */}
        <div className="bg-zinc-900 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
          {/* 左侧控制台标识 */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500/80" />
            <span className="w-2 h-2 rounded-full bg-amber-500/80" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
            <span className="text-[10px] font-mono text-zinc-500 font-extrabold ml-1.5 whitespace-nowrap">
              xbnets-vlogs-console
            </span>
          </div>

          {/* 右侧设备通道切换器 */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t border-zinc-800/40 pt-2 sm:pt-0 sm:border-t-0">
            <div className="flex items-center gap-1.5">
              <Wifi className={cn("w-3.5 h-3.5 shrink-0", activeDeviceId ? "text-emerald-400" : "text-zinc-500")} />
              <span className="text-[10px] font-mono font-bold text-zinc-500 shrink-0">设备通道:</span>
            </div>
            
            <select
              value={activeDeviceId}
              onChange={(e) => {
                const newId = e.target.value;
                setActiveDeviceId(newId);
                setLogs([]); // 切换设备时清空历史日志缓存，防止混淆
              }}
              className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-emerald-400 font-mono text-[10px] h-6 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500/30 max-w-[190px] sm:max-w-xs truncate"
            >
              {devicesList.map((dev) => (
                <option key={dev.id} value={dev.id} className="bg-zinc-950 text-zinc-300">
                  {dev.id} ({dev.status === 'online' ? '在线' : '离线'})
                </option>
              ))}
              {user?.deviceId && !devicesList.some((d) => d.id === user.deviceId) && (
                <option value={user.deviceId} className="bg-zinc-950 text-zinc-500">
                  {user.deviceId} (浏览器大屏-无日志)
                </option>
              )}
              {devicesList.length === 0 && !user?.deviceId && (
                <option value="" className="bg-zinc-950 text-zinc-500">
                  暂无绑定物理设备
                </option>
              )}
            </select>
          </div>
        </div>

        {/* 原生日志渲染视窗 */}
        <div
          ref={scrollContainerRef}
          style={{ height: listHeight }}
          className="w-full bg-black/90 relative overflow-y-auto"
        >
          {filteredLogs.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 text-xs gap-1.5 animate-in fade-in duration-200">
              <Terminal className="w-7 h-7 opacity-35" />
              <span>暂无匹配此条件的实时诊断数据</span>
            </div>
          ) : (
            <div className="py-2 divide-y divide-zinc-900/10">
              {filteredLogs.map((log, index) => {
                let levelClass = 'text-sky-400';
                let contentClass = 'text-zinc-300';
                
                if (log.level === 'ERROR') {
                  levelClass = 'text-red-500 bg-red-950/40 border border-red-900/30 px-1 rounded font-black';
                  contentClass = 'text-red-400 bg-red-950/10 font-bold';
                } else if (log.level === 'WARN') {
                  levelClass = 'text-amber-500 font-bold';
                  contentClass = 'text-amber-300';
                }

                return (
                  <div
                    key={log.id || index}
                    className="flex flex-col py-2 px-3 hover:bg-zinc-900/30 transition-colors select-text font-mono text-[11px] leading-relaxed"
                  >
                    {/* 第一行：序号、时间、级别、模块 */}
                    <div className="flex items-center gap-2 select-none">
                      <span className="text-zinc-700 w-8 text-right font-bold">#{String(index + 1).padStart(3, '0')}</span>
                      <span className="text-zinc-500">[{log.time}]</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] shrink-0 font-bold tracking-wider", levelClass)}>
                        {log.level}
                      </span>
                      <span className="text-emerald-500 font-bold">[{log.module}]</span>
                    </div>
                    {/* 第二行：具体日志正文（换行显示，不直接接在info后面，不缩略） */}
                    <div className={cn("pl-10 mt-1 select-all break-all whitespace-pre-wrap", contentClass)}>
                      {log.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
