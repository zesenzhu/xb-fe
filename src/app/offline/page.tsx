'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, ServerOff, ShieldAlert } from 'lucide-react';

export default function OfflinePage() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOnlineStatus(navigator.onLine);
      
      const handleOnline = () => setOnlineStatus(true);
      const handleOffline = () => setOnlineStatus(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const handleReconnect = () => {
    setIsReconnecting(true);
    // 模拟重试检测
    setTimeout(() => {
      setIsReconnecting(false);
      if (typeof window !== 'undefined') {
        if (navigator.onLine) {
          // 如果检测到恢复在线，直接跳回登录或后台大厅
          window.location.href = '/user/login';
        } else {
          // 依然离线，刷新页面以让 Service Worker 重新判定
          window.location.reload();
        }
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6 select-none relative overflow-hidden">
      {/* 背景光斑科技感装饰 */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl -z-10 animate-pulse delay-75" />

      <div className="max-w-md w-full bg-slate-950/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
        
        {/* 顶部警告标志与呼吸灯 */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-amber-500/20 animate-ping duration-1000 opacity-60" />
          <div className="relative bg-slate-900 border border-slate-800 p-5 rounded-2xl text-amber-500 shadow-lg">
            <WifiOff className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        {/* 核心提示文案 */}
        <div className="space-y-2">
          <h2 className="text-xl font-black tracking-wider text-slate-100">
            🔌 离线断网守护中
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed px-2">
            控制后台检测到您的设备断开了网络连接。请检查您的网线或局域网 Wi-Fi 是否正常。
          </p>
        </div>

        {/* 状态卡片 */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/40 text-left space-y-2">
          <div className="flex items-center gap-2.5 text-xs">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-slate-300 font-semibold">本地守护机制已自动启用</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
            本地离线脚本正持续保持底层状态同步，一旦检测到网络信号回复，系统将立刻为您恢复大屏刷新与挂机连接。
          </p>
        </div>

        {/* 控制按钮 */}
        <div className="pt-2">
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="w-full h-11 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 border-0 cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? '正在尝试重新建立连线...' : '手动重试连接'}
          </button>
        </div>

        {/* 底部小状态 */}
        <div className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5 select-none">
          <ServerOff className="w-3.5 h-3.5" />
          <span>网络检测状态: {onlineStatus ? '🟢 已上线 (等待重载)' : '🔴 离线'}</span>
        </div>
      </div>
    </div>
  );
}
