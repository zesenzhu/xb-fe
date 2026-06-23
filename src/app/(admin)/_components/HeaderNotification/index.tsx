'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, AlertCircle, AlertTriangle, Info, Check, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { useUserStore } from '@/store/useUserStore';

interface SystemNotification {
  id: string;
  title: string;
  content: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  type: string;
  isRead: boolean;
  deviceId?: string;
  deviceName?: string;
  registerCode?: string;
  createdAt: string;
}

export default function HeaderNotification() {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取未读通知数量和最近列表
  const fetchNotificationStats = async () => {
    try {
      const countRes: any = await api.get('/notifications/unread-count');
      setUnreadCount(countRes.count);

      const listRes: any = await api.get('/notifications', {
        params: { isRead: 'false', page: 1, limit: 6 },
      });
      setNotifications(listRes.list || []);
    } catch (err) {
      console.warn('获取系统通知统计失败:', err);
    }
  };

  // 一键清脆合成提示音 (ERROR / WARN 时调用)
  const playAlertSound = (level: string) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      // ERROR 使用更高频警示音，WARN/INFO 采用清脆悦耳低音
      oscillator.frequency.setValueAtTime(level === 'ERROR' ? 880 : 587.33, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + (level === 'ERROR' ? 0.25 : 0.15));
    } catch (e) {
      // 浏览器若未产生用户交互可能会拦截音频播放，属于静默机制
      console.debug('浏览器拦截了提示音合成:', e);
    }
  };

  // 全局实时 SSE 监听
  useEffect(() => {
    fetchNotificationStats();

    // 建立持久 SSE 连接
    const token = useUserStore.getState().adminAccessToken;
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';
    const eventSource = new EventSource(`${baseURL}/notifications/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const newNotify: SystemNotification = JSON.parse(event.data);
        
        // 增量更新状态
        setUnreadCount((prev) => prev + 1);
        setNotifications((prev) => [newNotify, ...prev].slice(0, 6));

        // 播放合成警告提示音
        playAlertSound(newNotify.level);

        // 使用 sonner 进行大卡片全局横幅通知
        const toastStyle = 
          newNotify.level === 'ERROR' 
            ? 'bg-red-500 text-white' 
            : newNotify.level === 'WARN' 
            ? 'bg-amber-500 text-white' 
            : 'bg-indigo-600 text-white';

        toast.custom((t) => (
          <div className={`w-[350px] p-4 rounded-xl shadow-2xl flex flex-col gap-2 border border-slate-200/20 backdrop-blur-md ${toastStyle}`}>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs tracking-wider uppercase opacity-85">
                {newNotify.level === 'ERROR' ? '🚨 严重警报' : newNotify.level === 'WARN' ? '⚠️ 系统警告' : 'ℹ️ 系统通知'}
              </span>
              <button 
                onClick={() => toast.dismiss(t)}
                className="text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
            <div className="font-bold text-sm leading-snug">{newNotify.title}</div>
            <div className="text-xs opacity-90 line-clamp-2 leading-relaxed">{newNotify.content}</div>
            {newNotify.registerCode && (
              <div className="flex justify-end gap-2 mt-1">
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="h-7 text-[10px] font-bold bg-white/20 text-white hover:bg-white/30 border-0"
                  onClick={() => {
                    toast.dismiss(t);
                    router.push(`/admin/code?search=${newNotify.registerCode}`);
                  }}
                >
                  去排查
                </Button>
              </div>
            )}
          </div>
        ), { duration: 6000 });

      } catch (err) {
        console.error('解析推送的通知数据出错:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('通知 SSE 消息流异常断开或重连中...', err);
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  // 点击组件外侧自动收起下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 相对时间计算
  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 45) return '刚刚';
      if (diffMin < 60) return `${diffMin}分钟前`;
      if (diffHour < 24) return `${diffHour}小时前`;
      return `${diffDay}天前`;
    } catch {
      return '未知时间';
    }
  };

  // 单条已读
  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch('/notifications/read', { ids: [id] });
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('标记通知已读失败:', err);
    }
  };

  // 全部已读
  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications([]);
      toast.success('已全部标记为已读');
    } catch (err) {
      console.error('一键已读失败:', err);
    }
  };

  // 点击通知跳转与已读
  const handleNotificationClick = async (item: SystemNotification) => {
    try {
      // 1. 自动置为已读
      await api.patch('/notifications/read', { ids: [item.id] });
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
      setIsOpen(false);

      // 2. 根据类型进行对应页面跳转
      if (item.type.startsWith('server_') || item.type.startsWith('log_')) {
        router.push('/admin/dashboard');
      } else if (item.registerCode) {
        router.push(`/admin/code?search=${item.registerCode}`);
      } else {
        router.push('/admin/dashboard'); // 默认兜底
      }
    } catch (err) {
      console.error('操作通知项失败:', err);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* 消息铃铛按钮 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-slate-100 dark:hover:bg-zinc-800"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white font-mono text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* 高颜值 Popover 下拉通知面板 */}
      {isOpen && (
        <div className="absolute right-0 mt-3.5 w-[380px] rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl border border-slate-200/80 dark:border-zinc-800/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 duration-250 select-none">
          {/* 头部面板 */}
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-zinc-800/60 flex items-center justify-between">
            <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              系统通报消息
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400 font-extrabold">
                  {unreadCount} 条未读
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity flex items-center gap-0.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                全部已读
              </button>
            )}
          </div>

          {/* 面板列表区 */}
          <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/40 custom-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className="p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/35 transition-colors cursor-pointer flex gap-3 relative group"
                >
                  {/* 左侧状态级别图标 */}
                  <div className="shrink-0 mt-0.5">
                    {item.level === 'ERROR' ? (
                      <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    ) : item.level === 'WARN' ? (
                      <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/20 text-sky-500 dark:text-sky-400">
                        <Info className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* 中间文本内容 */}
                  <div className="flex-1 space-y-1 pr-6">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 leading-tight">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {item.content}
                    </p>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-1 font-semibold">
                      {getRelativeTime(item.createdAt)}
                    </div>
                  </div>

                  {/* 悬浮已读标记小按钮 */}
                  <button
                    onClick={(e) => handleMarkAsRead(item.id, e)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="标记为已读"
                  >
                    <Check className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-zinc-500">
                <Bell className="w-8 h-8 opacity-25 mb-2.5 animate-bounce" />
                <span className="text-xs font-semibold">暂无新通知消息</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
