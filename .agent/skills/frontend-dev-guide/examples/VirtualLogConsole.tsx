import React, { useRef, useEffect, useState } from 'react';
import { List } from 'react-window';

interface VirtualLogConsoleProps {
  logs: string[];
  onClear: () => void;
}

export function VirtualLogConsole({ logs, onClear }: VirtualLogConsoleProps) {
  const listRef = useRef<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [displayLogs, setDisplayLogs] = useState<string[]>([]);

  // 内存淘汰与暂停渲染双重保障
  useEffect(() => {
    if (isPaused) return; // 暂停状态下不更新显示列表

    // 内存淘汰策略：最大仅在显示队列中保留 5000 条数据，超过的头部移出，保护 DOM 和内存
    const maxLogsLimit = 5000;
    if (logs.length > maxLogsLimit) {
      setDisplayLogs(logs.slice(-maxLogsLimit));
    } else {
      setDisplayLogs(logs);
    }
  }, [logs, isPaused]);

  // 尾部滚动锚定：当日志追加时，自动滚动到最底部
  useEffect(() => {
    if (!isPaused && listRef.current && displayLogs.length > 0) {
      listRef.current.scrollToRow({
        index: displayLogs.length - 1,
        align: 'end',
      });
    }
  }, [displayLogs.length, isPaused]);

  // 导出日志为本地 file
  const handleExport = () => {
    if (displayLogs.length === 0) return;
    const blob = new Blob([displayLogs.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `device_logs_${new Date().toISOString()}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 行组件：Row 的入参使用 any 类型，巧妙避开 react-window 的深递归类型死锁
  const Row = ({ index, style }: any) => {
    const log = displayLogs[index] || '';
    
    // 日志颜色解析逻辑
    let colorClass = 'text-zinc-300';
    if (log.includes('[ERROR]')) colorClass = 'text-red-400 font-bold';
    else if (log.includes('[WARN]')) colorClass = 'text-yellow-400';
    else if (log.includes('[INFO]')) colorClass = 'text-emerald-400';

    return (
      <div style={style} className={`font-mono text-[11px] py-0.5 px-4 truncate border-b border-zinc-900/50 ${colorClass}`}>
        <span className="text-zinc-600 mr-2">[{index + 1}]</span>
        {log}
      </div>
    );
  };

  return (
    <div className="w-full bg-zinc-950 rounded-xl border border-zinc-800 p-4 shadow-2xl flex flex-col gap-3">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
          <span className="text-xs font-semibold text-zinc-200">
            {isPaused ? '日志监听暂停中...' : '实时日志监听物理信道已激活'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-xs font-medium transition-all"
          >
            {isPaused ? '继续捕获' : '暂停捕获'}
          </button>
          <button
            onClick={handleExport}
            disabled={displayLogs.length === 0}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-md text-xs font-medium transition-all"
          >
            导出日志
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-900/40 text-red-300 rounded-md text-xs font-medium transition-all"
          >
            清空日志
          </button>
        </div>
      </div>

      {/* 终端显示器 */}
      <div className="w-full h-[400px] bg-black rounded-lg border border-zinc-900 relative overflow-hidden">
        {displayLogs.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600 font-mono">
            等待物理信道下位机推送日志帧...
          </div>
        ) : (
          <List
            listRef={listRef}
            height={400}
            width="100%"
            rowCount={displayLogs.length}
            rowHeight={26}
            rowComponent={Row}
            rowProps={{}} // React 19 / react-window 2.2+ 必须空对象占位
          />
        )}
      </div>
    </div>
  );
}
