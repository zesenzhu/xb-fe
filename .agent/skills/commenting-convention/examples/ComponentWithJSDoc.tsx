/**
 * @file: ComponentWithJSDoc.tsx
 * @description: 包含极其标准的 JSDoc、TSX Props、Zustand 主题订阅与 JSX 深度注释的 React 组件样板。
 * @author: Antigravity AI
 * @date: 2026-06-02
 */

import React, { useState, useEffect } from 'react';

/**
 * 仪表盘控制面板属性接口。
 */
export interface ControlPanelProps {
  /**
   * 当前连接的设备唯一标识符 (MAC/IP)。
   * @example '00:1A:2B:3C:4D:5E'
   */
  deviceId: string;

  /**
   * 是否正处于长连接在线状态。
   * 用于控制呼吸灯组件的物理闪烁频率。
   */
  isOnline: boolean;

  /**
   * 触发设备断开连接或挂起任务的异步回调函数。
   */
  onDisconnect: () => Promise<void>;
}

/**
 * 设备智能仪表盘控制面板。
 * 
 * [功能职责]
 * 1. 状态指示：通过高保真呼吸灯展示端侧硬件心跳状态；
 * 2. 物理熔断：一键切断下位机连接并发出 RESTful API 命令；
 * 3. 统计计数：跟踪当前已运行的智能任务时间。
 */
export function ControlPanel({ deviceId, isOnline, onDisconnect }: ControlPanelProps) {
  // 1. 运行时间计时器状态，以秒为单位
  const [runningSeconds, setRunningSeconds] = useState<number>(0);
  
  // 2. 物理网络断开挂起状态锁，防止高频重复点击
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  // 3. 物理心跳累积计时：当设备在线时，每秒累加运行时间
  useEffect(() => {
    if (!isOnline) {
      // 如果设备离线，自动重置运行时间归零
      setRunningSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setRunningSeconds((prev) => prev + 1);
    }, 1000);

    // 物理清理：防止组件卸载时发生内存泄漏与无用 CPU 消耗
    return () => clearInterval(interval);
  }, [isOnline]);

  /**
   * 执行物理切断连接指令。
   * 开启互斥锁防止重复点击，并在执行结束后自动释放锁。
   */
  const handleExecuteDisconnect = async () => {
    // 互斥安全拦截，防止极速双击产生的 QPS 限流拦截
    if (isDisconnecting) return;
    
    try {
      setIsDisconnecting(true);
      await onDisconnect();
    } catch (error) {
      console.error('[ControlPanel] 物理切断连接异常: ', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl max-w-sm flex flex-col gap-4">
      {/* 顶部标题与呼吸灯区域 */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">设备标识</span>
          <span className="text-sm font-bold text-zinc-200 font-mono">{deviceId}</span>
        </div>
        
        {/* 
          1. 物理网络呼吸灯指示器：
             - 在线状态：闪烁翡翠绿 (bg-emerald-500 animate-pulse)
             - 离线状态：常亮静止红 (bg-red-500)
        */}
        <div className="flex items-center gap-1.5 bg-zinc-900/60 py-1 px-2.5 rounded-full border border-zinc-800/40">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] font-semibold text-zinc-400">
            {isOnline ? '在线' : '离线'}
          </span>
        </div>
      </div>

      {/* 运行计时显示 */}
      <div className="flex flex-col gap-1 py-1">
        <span className="text-[10px] text-zinc-500 font-mono">持续在线时间</span>
        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-mono">
          {Math.floor(runningSeconds / 60)}m {runningSeconds % 60}s
        </span>
      </div>

      {/* 
        2. 操作物理熔断按钮：
           - 按钮禁用态：当设备已离线，或者正在执行断开任务时，自动变灰并阻断 hover 缩放交互。
      */}
      <button
        onClick={handleExecuteDisconnect}
        disabled={!isOnline || isDisconnecting}
        className="w-full py-2 bg-red-950/40 border border-red-900/50 hover:bg-red-900/40 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-red-950/40 text-red-300 rounded-lg text-xs font-semibold active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed"
      >
        {isDisconnecting ? '正在注销断开...' : '强制断开物理连接'}
      </button>
    </div>
  );
}
