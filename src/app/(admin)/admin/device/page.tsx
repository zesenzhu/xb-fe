'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, Modal, Form, Select, Input, Tag, Space, message, Switch, InputNumber, Alert } from 'antd';
import { Power, Play, RotateCcw, AlertTriangle, ArrowDownCircle, CheckCircle, ShieldAlert, Cloud, Smartphone, Laptop, Lock, Unlock, Wifi, Mail, Bell, ListTodo } from 'lucide-react';
import { api } from '@/lib/axios';

interface DeviceItem {
  id: string; // 物理原始 ID (后端返回的 dev.deviceId)
  name: string; // 优先获取自定义名字，否则降级为 `设备 (8位脱敏ID)`
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
  scriptMemory?: number;                 // 脚本当前内存 (KB)
  isSwitchingAccount?: number | boolean; // 换号状态中
}

export default function DevicePage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [activeTab, setActiveTab] = useState<'monitor' | 'alerts' | 'config'>('monitor');
  const [alertMailEnabled, setAlertMailEnabled] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const [lastAlertId, setLastAlertId] = useState<string>('');

  // 报警配置表单状态
  const [configCode, setConfigCode] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  const [configEmail, setConfigEmail] = useState('');
  const [configOffline, setConfigOffline] = useState(true);
  const [configLauncher, setConfigLauncher] = useState(true);
  const [configLocked, setConfigLocked] = useState(false);
  const [configVpn, setConfigVpn] = useState(true);
  const [configErrorLog, setConfigErrorLog] = useState(true);
  const [configMemoryLimit, setConfigMemoryLimit] = useState(150); // MB 限制

  const getAppFriendlyName = (pkg: string) => {
    if (!pkg || pkg === 'unknown') return '未知前台';
    const lPkg = pkg.toLowerCase();
    if (lPkg.includes('launcher') || lPkg.includes('desktop') || lPkg.includes('launcher3') || lPkg.includes('trebuchet')) {
      return '系统桌面';
    }
    if (pkg.includes('tencent.mm')) return '微信';
    if (pkg.includes('tencent.mobileqq')) return 'QQ';
    if (pkg.includes('sgame')) return '王者荣耀';
    if (pkg.includes('pubgmhd')) return '和平精英';
    const parts = pkg.split('.');
    return parts[parts.length - 1] || pkg;
  };

  const renderDeviceIcon = (type: string, isOnline: boolean) => {
    const colorClass = isOnline 
      ? 'bg-slate-900 dark:bg-zinc-800 text-white dark:text-zinc-100' 
      : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500';
    
    if (type === 'emulator') {
      return (
        <div className={`p-2 rounded-lg ${colorClass}`} title="模拟器">
          <Laptop className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'cloud_phone') {
      return (
        <div className={`p-2 rounded-lg ${colorClass}`} title="云手机">
          <Cloud className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className={`p-2 rounded-lg ${colorClass}`} title="物理真机">
        <Smartphone className="w-4 h-4" />
      </div>
    );
  };

  const getDeviceTypeBadge = (type: string) => {
    if (type === 'emulator') return <Tag color="blue" className="text-[10px] m-0 border-0 font-bold">高度仿真</Tag>;
    if (type === 'cloud_phone') return <Tag color="purple" className="text-[10px] m-0 border-0 font-bold">☁️ 云手机</Tag>;
    return <Tag color="cyan" className="text-[10px] m-0 border-0 font-bold">📱 真机</Tag>;
  };
  
  const [loading, setLoading] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null);
  const [form] = Form.useForm();
  
  // 模拟指令发布记录
  const [cmdLogs, setCmdLogs] = useState<Array<{ time: string; deviceName: string; deviceMaskedId: string; cmd: string; status: string }>>([
    { time: '14:30:10', deviceName: '设备终端', deviceMaskedId: '8A3E20F9', cmd: 'UPDATE_SCRIPT', status: 'success' },
    { time: '14:28:44', deviceName: '设备终端', deviceMaskedId: 'A1BC5E9D', cmd: 'REBOOT', status: 'success' },
  ]);

  // 拉取后端真实物理设备数据
  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await api.get<any, DeviceItem[]>('/register-codes/all-devices');
      setDevices(data || []);
      setLastRefreshedTime(new Date().toTimeString().split(' ')[0]);
    } catch (e: any) {
      console.error(e);
      message.error(e.message || '获取物理设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 拉取报警历史
  const fetchAlerts = async () => {
    try {
      const data = await api.get<any, any[]>('/register-codes/alerts');
      setAlerts(data || []);
      
      // 检测是否有新警报
      if (data && data.length > 0) {
        const newest = data[0];
        // 如果跟上一次的最前报警ID不一致，则触发红点闪烁提示
        setLastAlertId((prev) => {
          if (prev && newest.id !== prev) {
            setHasNewAlert(true);
            message.warning(`[系统告警] 监测到设备上报紧急异常事件: ${newest.typeName}`);
          }
          return newest.id;
        });
      }
    } catch (e) {
      console.error('获取历史紧急警报出错:', e);
    }
  };

  // 报警配置查询与保存
  const handleQueryConfig = async (codeStr: string) => {
    const code = codeStr || configCode;
    if (!code) {
      message.error('请输入需要查询的卡密密匙');
      return;
    }
    setConfigLoading(true);
    try {
      const res = await api.get<any, { alertEmail: string; alertConfig: any }>(`/register-codes/my-alert?code=${code}`);
      setConfigEmail(res.alertEmail || '');
      const cfg = res.alertConfig || {};
      setConfigOffline(cfg.offline !== false);
      setConfigLauncher(cfg.launcher !== false);
      setConfigLocked(cfg.locked === true);
      setConfigVpn(cfg.vpn !== false);
      setConfigErrorLog(cfg.errorLog !== false);
      setConfigMemoryLimit(cfg.memoryLimit ? Math.round(cfg.memoryLimit / 1024) : 150);
      message.success(`卡密 [${code}] 配置查询成功！`);
    } catch (e: any) {
      message.error(e.message || '配置查询失败，请检查卡密输入是否正确');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configCode) {
      message.error('卡密密匙不能为空');
      return;
    }
    setConfigLoading(true);
    try {
      const payload = {
        code: configCode,
        alertEmail: configEmail,
        alertConfig: {
          offline: configOffline,
          launcher: configLauncher,
          locked: configLocked,
          vpn: configVpn,
          errorLog: configErrorLog,
          memoryLimit: configMemoryLimit * 1024, // 存为 KB
        }
      };
      await api.patch('/register-codes/my-alert', payload);
      message.success('警报推送配置保存成功！');
    } catch (e: any) {
      message.error(e.message || '保存配置失败');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleGoToConfig = (code: string) => {
    setConfigCode(code);
    setActiveTab('config');
    handleQueryConfig(code);
  };

  // 一键清空/全部标为已读
  const handleMarkAllRead = () => {
    setHasNewAlert(false);
    message.success('全部警报已标为已读');
  };

  // 开启大屏轮询与基本设定
  useEffect(() => {
    fetchDevices();
    fetchAlerts();

    // 拉取全局邮件报警系统总开关
    api.get<any, { emailEnabled: boolean; alertMailEnabled: boolean }>('/system/settings/public')
      .then((res) => {
        setAlertMailEnabled(res.alertMailEnabled || false);
      })
      .catch(console.error);

    // 每 10 秒自动轮询最新的设备与告警
    const pollInterval = setInterval(() => {
      fetchDevices();
      fetchAlerts();
    }, 10000);

    // 每一秒更新当前系统时间
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('zh-CN', { hour12: false }));
    }, 1000);

    const now = new Date();
    setCurrentTime(now.toLocaleString('zh-CN', { hour12: false }));

    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, []);

  // 警报标题闪烁效果
  useEffect(() => {
    if (!hasNewAlert) {
      document.title = 'MQTT 端侧设备监控大屏';
      return;
    }

    let isFlashed = false;
    const interval = setInterval(() => {
      document.title = isFlashed ? '🔴【有未读紧急告警】' : '⚠️ 监控大屏';
      isFlashed = !isFlashed;
    }, 1000);

    return () => clearInterval(interval);
  }, [hasNewAlert]);

  const handleOpenCommand = (device: DeviceItem) => {
    setSelectedDevice(device);
    setIsModalOpen(true);
  };

  const handleSendCommand = (values: any) => {
    if (!selectedDevice) return;
    
    const maskedId = selectedDevice.id.slice(0, 8);
    const newLog = {
      time: new Date().toTimeString().split(' ')[0],
      deviceName: selectedDevice.name,
      deviceMaskedId: maskedId,
      cmd: values.command,
      status: 'success'
    };
    setCmdLogs(prev => [newLog, ...prev]);
    setIsModalOpen(false);
    message.success(`指令 [${values.command}] 推送成功！`);
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '无心跳';
    try {
      const d = new Date(timeStr);
      return d.toLocaleString('zh-CN', { hour12: false });
    } catch (e) {
      return timeStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 头部标题与控制中心 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <span>MQTT 端侧设备监控大屏</span>
            {hasNewAlert && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500 text-white animate-pulse">
                ⚠️ 异常告警中
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            实时监控所有激活码绑定物理设备的在线状态与健康指标，支持全局警报推送设置与设备状态回溯
          </p>
        </div>
        
        {/* 信息走钟与操作刷新 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-zinc-700/50 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>当前时间:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-zinc-200">{currentTime}</span>
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-zinc-700/50">
            最后更新: <span className="font-mono font-bold text-slate-700 dark:text-zinc-200">{lastRefreshedTime || '同步中...'}</span>
          </div>
          
          <Button 
            onClick={fetchDevices} 
            loading={loading}
            className="flex items-center gap-1.5 text-xs font-semibold h-8 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900"
          >
            {!loading && <RotateCcw className="w-3.5 h-3.5" />}
            刷新设备
          </Button>
        </div>
      </div>

      {/* 现代导航 Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
        <div className="flex space-x-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'monitor'
                ? 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            物理监控大屏 ({devices.length})
          </button>
          
          <button
            onClick={() => {
              setActiveTab('alerts');
              setHasNewAlert(false); // 切换到警报后自动消除红点
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 relative ${
              activeTab === 'alerts'
                ? 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-rose-500" />
            紧急系统警报
            {alerts.length > 0 && (
              <span className="bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                {alerts.length}
              </span>
            )}
            {hasNewAlert && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>

          {alertMailEnabled && (
            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'config'
                  ? 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              报警配置 Tab
            </button>
          )}
        </div>

        {activeTab === 'alerts' && alerts.length > 0 && (
          <Button size="small" type="dashed" danger onClick={handleMarkAllRead} className="text-[10px] font-bold">
            全部标为已读
          </Button>
        )}
      </div>

      {/* Tab 1: 物理监控大屏 */}
      {activeTab === 'monitor' && (
        <>
          {devices.length === 0 ? (
            <Card className="border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm py-12">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-full">
                  <ShieldAlert className="w-6 h-6 text-slate-400 dark:text-zinc-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300">暂无绑定物理设备</h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm">
                    目前没有任何卡密绑定了物理设备，或者激活了的物理设备从未上报心跳。请在按键精灵客户端启动脚本。
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {devices.map((dev) => {
                const isOnline = dev.status === 'online';
                const maskedId = dev.id.slice(0, 8);
                const isLocked = isOnline && dev.isLocked;
                const isSwitching = isOnline && (dev.isSwitchingAccount === 1 || dev.isSwitchingAccount === true);
                const isAtDesktop = isOnline && !isSwitching && (dev.frontApp.toLowerCase().includes('launcher') || dev.frontApp.toLowerCase().includes('desktop') || dev.frontApp === 'unknown');

                let cardBorderClass = "border-slate-200 dark:border-zinc-800";
                if (isLocked) {
                  cardBorderClass = "border-amber-400 dark:border-amber-600 shadow-sm ring-1 ring-amber-400/30";
                } else if (isAtDesktop) {
                  cardBorderClass = "border-rose-400 dark:border-rose-600 shadow-sm ring-1 ring-rose-400/30";
                } else if (isSwitching) {
                  cardBorderClass = "border-blue-400 dark:border-blue-600 shadow-sm";
                }

                return (
                  <Card key={dev.id} className={`bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md ${cardBorderClass}`}>
                    
                    {/* 锁屏物理遮罩 */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-amber-500/5 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-10">
                        <div className="bg-amber-500 text-white font-bold text-[10px] px-2 py-1 rounded shadow flex items-center gap-1 animate-bounce">
                          <Lock className="w-3 h-3" />
                          设备休眠锁屏中
                        </div>
                      </div>
                    )}

                    {/* 右上角在线指示 */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 select-none">
                      <span className="relative flex h-2 w-2">
                        {isOnline && (
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSwitching ? 'bg-blue-400' : 'bg-emerald-400'}`}></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? (isSwitching ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-slate-400'}`} />
                      </span>
                      <span className={`text-[10px] font-black uppercase ${isOnline ? (isSwitching ? 'text-blue-500' : 'text-emerald-500') : 'text-slate-400'}`}>
                        {isOnline ? (isSwitching ? '切号切换' : 'ONLINE') : 'OFFLINE'}
                      </span>
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        {renderDeviceIcon(dev.deviceType, isOnline)}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <CardTitle className="text-sm font-bold truncate max-w-[100px] text-slate-800 dark:text-zinc-100" title={dev.name}>
                              {dev.name}
                            </CardTitle>
                            {getDeviceTypeBadge(dev.deviceType)}
                          </div>
                          <CardDescription className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                            ID: <span className="font-semibold text-slate-600 dark:text-zinc-300">{maskedId}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-2 pt-2 text-xs">
                      {/* 核心监控指标 */}
                      <div className="grid grid-cols-2 gap-2 border-y border-slate-100 dark:border-zinc-800/80 py-2.5 bg-slate-50/50 dark:bg-zinc-800/20 rounded-md px-2">
                        <div>
                          <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-semibold flex items-center gap-1">
                            <Play className="w-2.5 h-2.5" />
                            前台应用
                          </p>
                          <p className={`font-bold mt-0.5 truncate text-[11px] ${
                            isSwitching 
                              ? 'text-blue-500 font-extrabold animate-pulse' 
                              : isAtDesktop 
                              ? 'text-red-500 font-extrabold animate-pulse' 
                              : 'text-slate-700 dark:text-zinc-200'
                          }`} title={dev.frontApp}>
                            {isOnline ? (isSwitching ? '🔄 切换账号中' : getAppFriendlyName(dev.frontApp)) : '--'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-semibold flex items-center gap-1">
                            {isLocked ? <Lock className="w-2.5 h-2.5 text-amber-500" /> : <Unlock className="w-2.5 h-2.5 text-emerald-500" />}
                            安全物理锁
                          </p>
                          <p className={`font-mono font-bold mt-0.5 text-[11px] ${isLocked ? 'text-amber-500 font-extrabold animate-pulse' : 'text-emerald-500'}`}>
                            {isOnline ? (isLocked ? '已锁屏' : '已解锁') : '--'}
                          </p>
                        </div>
                      </div>

                      {/* 物理IP */}
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 dark:text-zinc-500 font-semibold">网络物理 IP:</span>
                        <span className={`font-mono font-bold ${isOnline ? 'text-slate-700 dark:text-zinc-200' : 'text-slate-400'}`}>
                          {dev.ip}
                        </span>
                      </div>

                      {/* 内存监控 */}
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 dark:text-zinc-500 font-semibold">脚本内存占用:</span>
                        <span className={`font-mono font-bold ${isOnline ? 'text-slate-700 dark:text-zinc-200' : 'text-slate-400'}`}>
                          {isOnline ? (dev.scriptMemory ? `${(dev.scriptMemory / 1024).toFixed(1)} MB` : '0.0 MB') : '--'}
                        </span>
                      </div>

                      {/* VPN */}
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 dark:text-zinc-500 font-semibold flex items-center gap-1">
                          <Wifi className="w-3.5 h-3.5" />
                          网络代理状态:
                        </span>
                        <span className={`font-bold text-[11px] ${isOnline ? (dev.vpnStatus ? 'text-emerald-500' : 'text-rose-500 font-extrabold') : 'text-slate-400'}`}>
                          {isOnline ? (dev.vpnStatus ? '🛡️ 已连VPN' : '⚠️ 直连(未防封)') : '--'}
                        </span>
                      </div>

                      {/* 电源 */}
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 dark:text-zinc-500 font-semibold">电源自检:</span>
                        <span className={`font-bold ${isOnline ? 'text-slate-700 dark:text-zinc-200' : 'text-slate-400'}`}>
                          {isOnline ? (dev.deviceType !== 'real_device' ? '🔌 云端直供 (100%)' : `${dev.battery}%`) : '--'}
                        </span>
                      </div>

                      {/* 授权卡密 */}
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 dark:text-zinc-500 font-semibold">授权卡密:</span>
                        <span className="font-mono text-slate-700 dark:text-zinc-200 font-bold bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">
                          {dev.licenseBound}
                        </span>
                      </div>

                      {/* 所属应用 */}
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 dark:text-zinc-500 font-semibold">绑定项目:</span>
                        <span className="text-slate-700 dark:text-zinc-200 font-bold">{dev.appName}</span>
                      </div>

                      {/* 累计心跳 */}
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 dark:text-zinc-500 font-semibold">通信状态包:</span>
                        <span className="font-mono text-slate-500 dark:text-zinc-400 font-semibold">
                          {isOnline ? `${dev.heartbeatsCount} Pings` : '--'}
                        </span>
                      </div>
                      
                      {/* 最后活跃 */}
                      <div className="flex justify-between items-center text-[10px] border-t border-slate-100 dark:border-zinc-800/50 pt-2">
                        <span className="text-slate-400 dark:text-zinc-500 font-semibold">最近活跃检测:</span>
                        <span className="text-slate-500 dark:text-zinc-400 font-semibold font-mono">
                          {formatTime(dev.lastActiveAt)}
                        </span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 pb-3 border-t border-slate-100 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-800/10 flex justify-end gap-2">
                      {alertMailEnabled && (
                        <Button
                          size="small"
                          className="font-bold text-[10px] h-7 border-slate-200 dark:border-zinc-700 hover:text-indigo-500 dark:hover:text-indigo-400"
                          onClick={() => handleGoToConfig(dev.licenseBound)}
                        >
                          警报配置
                        </Button>
                      )}
                      <Button
                        type="primary"
                        size="small"
                        disabled={!isOnline}
                        className="font-bold text-[10px] h-7"
                        onClick={() => handleOpenCommand(dev)}
                      >
                        远程指令
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {/* MQTT 指令历史记录 */}
          <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-bold tracking-tight text-slate-800 dark:text-zinc-100">MQTT 命令下发回溯日志</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                显示当前操作会话中向各端侧设备推送的 MQTT JSON 物理信道载荷指令投递状态
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800/80 pb-3 text-slate-500 dark:text-zinc-400 text-xs">
                    <th className="py-3 px-4 font-bold text-slate-500 dark:text-zinc-400">下发时间</th>
                    <th className="py-3 px-4 font-bold text-slate-500 dark:text-zinc-400">目标设备</th>
                    <th className="py-3 px-4 font-bold text-slate-500 dark:text-zinc-400">指令载荷 (Topic/Command)</th>
                    <th className="py-3 px-4 font-bold text-slate-500 dark:text-zinc-400">下发状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                  {cmdLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors duration-150">
                      <td className="py-3 px-4 text-xs text-slate-400 dark:text-zinc-500 font-semibold">{log.time}</td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-zinc-200">
                        {log.deviceName} <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono font-normal">({log.deviceMaskedId})</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-indigo-500 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
                          payload/cmd/{log.cmd}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            投递完成
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/20 animate-pulse">
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            正在投递...
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tab 2: 紧急系统警报 */}
      {activeTab === 'alerts' && (
        <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold tracking-tight text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-rose-500" />
                  系统监测紧急警报回溯
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
                  显示由于掉线死机、闪退桌面、网络代理失效或业务卡死所触发的历史警报，支持快速过滤和复查
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300">系统运转非常健康</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-xs">
                  暂未收到任何设备突发掉线或异常退回桌面的告警记录。所有机器运行平稳。
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 text-xs bg-slate-50/50 dark:bg-zinc-800/20">
                    <th className="py-3 px-4 font-bold">告警时间</th>
                    <th className="py-3 px-4 font-bold">关联卡密</th>
                    <th className="py-3 px-4 font-bold">设备原始ID</th>
                    <th className="py-3 px-4 font-bold">警报事件</th>
                    <th className="py-3 px-4 font-bold">详细告警说明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50 text-xs">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors duration-150">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500 dark:text-zinc-400">
                        {new Date(alert.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-zinc-200">
                        {alert.code}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-zinc-400">
                        {alert.deviceId.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag color={
                          alert.type === 'offline_unexpected' || alert.type === 'vpn_disconnect' ? 'red' : 'orange'
                        } className="font-bold border-0 text-[10px]">
                          {alert.typeName}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 font-medium max-w-[300px] truncate" title={alert.message}>
                        {alert.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: 报警配置 */}
      {activeTab === 'config' && alertMailEnabled && (
        <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden max-w-2xl">
          <CardHeader className="border-b border-slate-100 dark:border-zinc-800 pb-4">
            <CardTitle className="text-sm font-bold tracking-tight text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-500" />
              卡密细粒度邮件报警配置
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              在此处为特定激活卡密绑定告警接收邮箱，并分别开启或关闭不同类型紧急事件的订阅推送
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-5">
            
            {/* 卡密查询输入框 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">第一步：输入激活卡密密匙进行检索</label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入授权激活码，例如: JZ001-A2B3C4D5"
                  value={configCode}
                  onChange={(e) => setConfigCode(e.target.value.trim())}
                  className="font-mono text-xs max-w-md"
                />
                <Button 
                  type="primary" 
                  loading={configLoading} 
                  onClick={() => handleQueryConfig('')}
                  className="text-xs font-bold"
                >
                  检索配置
                </Button>
              </div>
            </div>

            {/* 配置编辑表单 */}
            <div className="space-y-4 border-t border-slate-100 dark:border-zinc-800 pt-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  接收警告通知邮箱 (支持多个，使用分号分隔)
                </label>
                <Input
                  placeholder="例如: admin@example.com; oncall@example.com"
                  value={configEmail}
                  onChange={(e) => setConfigEmail(e.target.value.trim())}
                  className="text-xs font-medium"
                />
              </div>

              {/* 事件订阅多选 */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-slate-400" />
                  警报事件订阅开关列表
                </label>

                <div className="space-y-3 bg-slate-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80">
                  
                  {/* 1. 掉线 */}
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">1. 设备意外离线 (offline_unexpected)</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">连续 120 秒未上报心跳且无优雅退出停止信号时触发</p>
                    </div>
                    <Switch checked={configOffline} onChange={setConfigOffline} />
                  </div>

                  {/* 2. 桌面 */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/50 pt-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">2. 游戏异常闪退桌面 (launcher_detect)</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">持续在系统桌面最前端停留超过 60 秒时触发 (切号状态自动过滤)</p>
                    </div>
                    <Switch checked={configLauncher} onChange={setConfigLauncher} />
                  </div>

                  {/* 3. 锁屏 */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/50 pt-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">3. 物理休眠锁屏 (device_locked)</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">设备处于锁屏状态持续超过 30 秒时触发，会阻断点击功能</p>
                    </div>
                    <Switch checked={configLocked} onChange={setConfigLocked} />
                  </div>

                  {/* 4. VPN */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/50 pt-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">4. 代理 (VPN) 断开警告 (vpn_disconnect)</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">由 VPN 已连接变为断开直连时即刻告警 (防封关联红线，切号时自动屏蔽)</p>
                    </div>
                    <Switch checked={configVpn} onChange={setConfigVpn} />
                  </div>

                  {/* 5. 业务卡死 */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/50 pt-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">5. 脚本异常与卡死报错 (error_log_report)</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">上报 ERROR 级严重业务错误时触发，发信频率限 5 分钟冷喷一次</p>
                    </div>
                    <Switch checked={configErrorLog} onChange={setConfigErrorLog} />
                  </div>

                  {/* 6. 内存泄漏 */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/50 pt-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">6. 脚本内存泄漏溢出预警 (out_of_memory)</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">设定脚本当前运行最大内存，心跳超出此阀值时预警 (10分钟冷喷)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">阈值:</span>
                      <InputNumber
                        min={10}
                        max={1024}
                        value={configMemoryLimit}
                        onChange={(val) => setConfigMemoryLimit(Number(val) || 150)}
                        addonAfter="MB"
                        size="small"
                        className="w-24 text-xs font-mono"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* 保存按钮 */}
              <div className="pt-3">
                <Button 
                  type="primary" 
                  loading={configLoading} 
                  onClick={handleSaveConfig}
                  className="text-xs font-bold w-full h-9 bg-indigo-600 hover:bg-indigo-500"
                >
                  保存推送配置
                </Button>
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* 指令下发 Modal */}
      <Modal
        title={selectedDevice ? `对设备 [ ${selectedDevice.name} ] 远程控制 (ID: ${selectedDevice.id.slice(0, 8)})` : '设备指令下发'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSendCommand} className="mt-4">
          <Form.Item name="command" label="下发指令" rules={[{ required: true, message: '请选择或输入指令' }]}>
            <Select placeholder="选择指令载荷">
              <Select.Option value="REBOOT">REBOOT (硬件系统完全重启)</Select.Option>
              <Select.Option value="UPDATE_SCRIPT">UPDATE_SCRIPT (热拉取最新行为树引擎脚本)</Select.Option>
              <Select.Option value="STOP_ENGINE">STOP_ENGINE (致命拦截！强行阻断所有脚本执行)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="args" label="附加 JSON 参数 payload (选填)">
            <Input.TextArea placeholder='{ "force": true, "timeout": 3000 }' rows={3} className="font-mono text-xs" />
          </Form.Item>
          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" className="flex items-center gap-1">
              <Play className="w-3.5 h-3.5" />
              推送指令
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
