'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, message, Input, Select } from 'antd';
import { Download, RefreshCw, Terminal, Search, Laptop, Smartphone, Cloud, Activity } from 'lucide-react';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';

interface DeviceItem {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline';
  licenseBound: string;
  appName: string;
  heartbeatsCount: number;
  activatedAt: string | null;
  lastActiveAt: string | null;
  deviceType: 'emulator' | 'cloud_phone' | 'real_device';
  frontApp: string;
  isLocked: boolean;
  vpnStatus: boolean;
  battery: number;
  scriptMemory?: number;
  isSwitchingAccount?: number | boolean;
  currentTask?: string;
  runningTime?: number;
}

interface LogLine {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  module: string;
  content: string;
}

export interface DeviceLogModalProps {
  open: boolean;
  deviceId: string;
  code: string;
  onCancel: () => void;
}

export default function DeviceLogModal({
  open,
  deviceId,
  code,
  onCancel,
}: DeviceLogModalProps) {
  const [currentActiveDeviceId, setCurrentActiveDeviceId] = useState<string>(deviceId);
  const [availableDevices, setAvailableDevices] = useState<DeviceItem[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceItem | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 本地过滤状态
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. 获取设备与日志数据
  const fetchData = async () => {
    if (!currentActiveDeviceId) return;
    setLoading(true);
    try {
      // 1.1 并行拉取最新历史日志和全部设备快照
      const [logsRes, devicesRes]: any[] = await Promise.all([
        api.get('/logs/history', {
          params: { deviceId: currentActiveDeviceId, limit: 120 },
        }),
        api.get('/register-codes/all-devices'),
      ]);

      // 1.2 缓存日志列表 (由于后端返回最新在前，展示在 Terminal 时反转为正序方便阅读)
      if (logsRes && logsRes.list) {
        const sortedLogs = [...logsRes.list].reverse();
        setLogs(sortedLogs);
      } else {
        setLogs([]);
      }

      // 1.3 查找匹配的物理设备信息与当前卡密下的所有设备
      if (devicesRes && Array.isArray(devicesRes)) {
        // 过滤出当前卡密下的所有绑定设备
        const bound = devicesRes.filter((d: DeviceItem) => d.licenseBound === code);
        setAvailableDevices(bound);

        const found = devicesRes.find((d: DeviceItem) => d.id === currentActiveDeviceId);
        if (found) {
          setDeviceInfo(found);
        } else {
          // 降级构建虚拟空设备以便展示基本 ID
          const fallbackDev: DeviceItem = {
            id: currentActiveDeviceId,
            name: `设备 (${currentActiveDeviceId.slice(0, 8)})`,
            ip: '--',
            status: 'offline',
            licenseBound: code,
            appName: '--',
            heartbeatsCount: 0,
            activatedAt: null,
            lastActiveAt: null,
            deviceType: 'real_device',
            frontApp: 'unknown',
            isLocked: false,
            vpnStatus: false,
            battery: 100,
          };
          setDeviceInfo(fallbackDev);
          if (!bound.some(d => d.id === currentActiveDeviceId)) {
            setAvailableDevices(prev => [...prev.filter(d => d.id !== currentActiveDeviceId), fallbackDev]);
          }
        }
      }
    } catch (err: any) {
      message.error(err.message || '加载设备运行快照及日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      setCurrentActiveDeviceId(deviceId);
    }
  }, [deviceId]);

  useEffect(() => {
    if (open && currentActiveDeviceId) {
      fetchData();
    } else {
      setDeviceInfo(null);
      setLogs([]);
      setLevelFilter('ALL');
      setSearchQuery('');
      setAvailableDevices([]);
    }
  }, [open, currentActiveDeviceId]);

  // 2. 流式导出当前设备日志
  const handleExport = async () => {
    if (!currentActiveDeviceId) return;
    setExporting(true);
    const key = 'modal-export';
    try {
      message.loading({ content: '正在生成日志文件并下载...', key });
      const response = await api.get<unknown, Blob>('/logs/export', {
        params: { deviceId: currentActiveDeviceId },
        responseType: 'blob',
      });
      
      const blob = response;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `设备_${deviceInfo?.name || currentActiveDeviceId}_24h日志.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success({ content: '日志导出下载成功！', key });
    } catch (err: any) {
      message.error({ content: err.message || '导出日志失败', key });
    } finally {
      setExporting(false);
    }
  };

  // 3. 本地前端关键字与等级联动过滤
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesSearch =
      searchQuery === '' ||
      log.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getDeviceIcon = (type: string, isOnline: boolean) => {
    const clz = isOnline 
      ? 'bg-slate-900 dark:bg-zinc-800 text-white' 
      : 'bg-slate-100 dark:bg-zinc-800 text-slate-400';
    if (type === 'emulator') return <Laptop className={cn("w-4 h-4 p-0.5 rounded", clz)} />;
    if (type === 'cloud_phone') return <Cloud className={cn("w-4 h-4 p-0.5 rounded", clz)} />;
    return <Smartphone className={cn("w-4 h-4 p-0.5 rounded", clz)} />;
  };

  return (
    <Modal
      title={
        <div className="flex items-center justify-between gap-4 select-none pr-6 w-full">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-500 animate-pulse" />
            <span className="font-extrabold text-sm text-slate-800 dark:text-zinc-100">设备运行状态与最新日志 TTY 控制台</span>
          </div>
          {availableDevices.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 dark:text-zinc-500 font-bold text-[10px]">切换设备:</span>
              <Select
                value={currentActiveDeviceId}
                onChange={(val) => setCurrentActiveDeviceId(val)}
                size="small"
                className="w-40 font-mono font-bold"
                popupMatchSelectWidth={false}
                options={availableDevices.map((d) => ({
                  value: d.id,
                  label: d.name.replace(/[-_]+(?=\)|）)/g, '') || d.id,
                }))}
              />
            </div>
          )}
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={760}
      className="device-log-terminal-modal"
    >
      {/* 1. 设备当前状态汇总卡片 */}
      <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-200/60 dark:border-zinc-800/80 p-4 rounded-2xl mb-4 select-none">
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-zinc-800/80 pb-3 mb-3">
          <div className="flex items-center gap-2">
            {deviceInfo && getDeviceIcon(deviceInfo.deviceType, deviceInfo.status === 'online')}
            <div>
              <div className="font-extrabold text-slate-800 dark:text-zinc-50 text-sm flex items-center gap-1.5">
                {deviceInfo?.name ? deviceInfo.name.replace(/[-_]+(?=\)|）)/g, '') : '未知设备'}
                {deviceInfo && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border select-none ml-1.5",
                    deviceInfo.status === 'online'
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      deviceInfo.status === 'online' ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                    )} />
                    {deviceInfo.status === 'online' ? '在线' : '离线'}
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 break-all mt-0.5">
                设备物理ID: <span className="text-slate-600 dark:text-zinc-300 font-bold">{deviceId}</span>
              </div>
            </div>
          </div>
          
          <Button
            size="small"
            className="flex items-center gap-1 text-[11px] h-7 font-bold rounded-lg"
            onClick={fetchData}
            loading={loading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            刷新快照
          </Button>
        </div>

        {/* 核心监控指标格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white dark:bg-zinc-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-zinc-800/60">
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">前台正在跑</p>
            <p className="font-extrabold text-slate-700 dark:text-zinc-200 truncate mt-1 text-[11px]" title={deviceInfo?.frontApp}>
              {deviceInfo?.status === 'online' ? (deviceInfo.isSwitchingAccount ? '🔄 账号切换中' : deviceInfo.frontApp) : '--'}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-zinc-800/60">
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">安全物理锁</p>
            <p className={cn("font-bold mt-1 text-[11px]", deviceInfo?.isLocked ? "text-amber-500 animate-pulse" : "text-emerald-500")}>
              {deviceInfo?.status === 'online' ? (deviceInfo.isLocked ? '🔒 锁屏休眠' : '🔓 已解锁') : '--'}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-zinc-800/60">
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">代理 VPN 状态</p>
            <p className={cn("font-bold mt-1 text-[11px]", deviceInfo?.vpnStatus ? "text-emerald-500" : "text-rose-500 font-extrabold")}>
              {deviceInfo?.status === 'online' ? (deviceInfo.vpnStatus ? '🛡️ 已连VPN' : '⚠️ 无安全代理') : '--'}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-zinc-800/60">
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">电量 / 内存</p>
            <p className="font-bold text-slate-700 dark:text-zinc-200 mt-1 text-[11px] font-mono">
              {deviceInfo?.status === 'online' 
                ? `${deviceInfo.battery}% | ${deviceInfo.scriptMemory ? (deviceInfo.scriptMemory / 1024).toFixed(1) : 0}MB` 
                : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. 联合本地查询与级别过滤器 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-850 p-2.5 rounded-2xl mb-3 flex items-center justify-between gap-3 shadow-sm select-none">
        <div className="flex items-center gap-2 flex-1">
          <Select
            value={levelFilter}
            onChange={setLevelFilter}
            size="small"
            className="w-28 text-xs font-bold font-sans"
            options={[
              { value: 'ALL', label: '全部等级' },
              { value: 'INFO', label: 'INFO (正常)' },
              { value: 'WARN', label: 'WARN (警告)' },
              { value: 'ERROR', label: 'ERROR (致命)' },
            ]}
          />
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-2.5 w-3 h-3 text-slate-400 dark:text-zinc-650" />
            <Input
              placeholder="本地关键字检索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              className="pl-7 h-8 text-xs placeholder-slate-400 rounded-xl"
            />
          </div>
        </div>
        
        <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>匹配: {filteredLogs.length} 行</span>
        </div>
      </div>

      {/* 3. 暗黑 TTY 极客风格终端 */}
      <div className="bg-black border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative select-text">
        {/* Terminal Header */}
        <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-4 py-2 flex items-center justify-between select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-[9px] font-mono text-zinc-500 font-extrabold ml-1.5">
              xtlog@device-{deviceId.slice(0, 8)}:~/console
            </span>
          </div>
          <span className="text-[9px] font-mono text-zinc-600 font-bold">SNAPSHOT MODE</span>
        </div>

        {/* Terminal Output Screen */}
        <div 
          className="p-3 overflow-y-auto font-mono text-[11px] leading-relaxed max-h-[350px] min-h-[250px] bg-black/90 text-zinc-300"
          style={{ scrollbarWidth: 'thin' }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-zinc-500 gap-2 select-none">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-[10px] tracking-wider animate-pulse">CONNECTING POSTGRESQL & PULLING LOGS...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-zinc-600 gap-1.5 select-none">
              <Terminal className="w-6 h-6 opacity-30" />
              <span>暂无匹配此筛选条件的终端诊断日志</span>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, index) => {
                let lvlClass = 'text-sky-400';
                let contentClass = 'text-zinc-300';
                if (log.level === 'ERROR') {
                  lvlClass = 'text-red-500 bg-red-950/40 border border-red-900/30 px-1 rounded font-black';
                  contentClass = 'text-red-400 bg-red-950/10 font-semibold';
                } else if (log.level === 'WARN') {
                  lvlClass = 'text-amber-500 font-bold';
                  contentClass = 'text-amber-300';
                }

                return (
                  <div key={log.id || index} className="hover:bg-zinc-900/35 py-0.5 px-1.5 rounded transition-colors flex items-start gap-1.5">
                    <span className="text-zinc-650 shrink-0 select-none">
                      #{String(index + 1).padStart(3, '0')}
                    </span>
                    <span className="text-zinc-500 shrink-0 select-none">[{log.time}]</span>
                    <span className={cn("shrink-0", lvlClass)}>{log.level}</span>
                    <span className="text-emerald-500 font-bold shrink-0">[{log.module}]</span>
                    <span className={cn("break-all whitespace-pre-wrap flex-1", contentClass)}>{log.content}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. 弹窗操作底栏 */}
      <div className="flex justify-end gap-2.5 pt-4 select-none">
        <Button onClick={onCancel} className="font-bold text-xs h-9 rounded-xl">
          关闭终端
        </Button>
        <Button
          type="primary"
          onClick={handleExport}
          loading={exporting}
          className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 border-transparent text-zinc-950 hover:text-zinc-950 shadow-md shadow-emerald-500/10 h-9 rounded-xl"
        >
          <Download className="w-3.5 h-3.5" />
          导出 24h 日志
        </Button>
      </div>
    </Modal>
  );
}
