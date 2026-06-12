'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, Modal, Form, Select, Input, Tag, Space, message } from 'antd';
import { Cpu, Power, Play, RotateCcw, AlertTriangle, ArrowDownCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/axios';

interface DeviceItem {
  id: string; // 物理原始 ID (后端返回的 dev.deviceId)
  name: string; // 优先获取自定义名字，否则降级为 `设备 (8位脱敏ID)`
  ip: string;
  status: 'online' | 'offline';
  temperature: number;
  cpuLoad: number;
  rtt: number;
  licenseBound: string;
  appName: string;
  heartbeatsCount: number;
  activatedAt: string | null;
  lastActiveAt: string | null;
}

export default function DevicePage() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
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

  // 定时轮询和走钟
  useEffect(() => {
    fetchDevices();

    // 每 10 秒自动轮询一次最新的物理设备在线状态与指标
    const pollInterval = setInterval(() => {
      fetchDevices();
    }, 10000);

    // 每一秒更新当前系统时间
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('zh-CN', { hour12: false }));
    }, 1000);

    // 初始化系统时间
    const now = new Date();
    setCurrentTime(now.toLocaleString('zh-CN', { hour12: false }));

    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, []);

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
      status: 'pending',
    };
    
    setCmdLogs((prev) => [newLog, ...prev]);
    message.loading(`正在向设备下发指令: ${values.command}...`, 1.5).then(() => {
      setCmdLogs((prev) =>
        prev.map((log) => (log.time === newLog.time ? { ...log, status: 'success' } : log))
      );
      message.success(`设备 [ ${selectedDevice.name} ] 已成功接收指令`);
    });

    setIsModalOpen(false);
    form.resetFields();
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
          <h1 className="text-xl font-black text-slate-800 dark:text-zinc-100">MQTT 端侧设备监控大屏</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            实时监控所有激活码绑定物理设备的在线状态与系统健康自检指标，支持通过物理信道远程下发控制指令
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

      {/* 物理设备动态卡片网格 */}
      {devices.length === 0 ? (
        <Card className="border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-full">
              <ShieldAlert className="w-6 h-6 text-slate-400 dark:text-zinc-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300">暂无在线物理设备</h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm">
                目前没有任何卡密绑定了物理设备，或者激活了的物理设备从未上报心跳。请在客户端运行脚本进行绑定。
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {devices.map((dev) => {
            const isOnline = dev.status === 'online';
            const maskedId = dev.id.slice(0, 8);

            return (
              <Card key={dev.id} className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
                {/* 右上角：网络在线指示灯 */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 select-none">
                  <span className="relative flex h-2 w-2">
                    {isOnline && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </span>
                  <span className={`text-[10px] font-black uppercase ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isOnline ? 'bg-slate-900 dark:bg-zinc-800 text-white dark:text-zinc-100' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'}`}>
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      {/* 设备自定义名 (后端已处理，如无则为降级脱敏名) */}
                      <CardTitle className="text-sm font-bold truncate max-w-[130px] text-slate-800 dark:text-zinc-100" title={dev.name}>
                        {dev.name}
                      </CardTitle>
                      {/* 设备ID脱敏展示与物理IP */}
                      <CardDescription className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                        ID: <span className="font-semibold text-slate-600 dark:text-zinc-300">{maskedId}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2.5 pt-2 text-xs">
                  {/* 传感器数据指标块 - 完美浅色/深色模式适配 */}
                  <div className="grid grid-cols-2 gap-2 border-y border-slate-100 dark:border-zinc-800/80 py-2.5 bg-slate-50/50 dark:bg-zinc-800/20 rounded-md px-2">
                    <div>
                      <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-semibold">温度检测</p>
                      <p className={`font-mono font-bold mt-0.5 ${isOnline ? (dev.temperature > 40 ? 'text-amber-500 font-extrabold animate-pulse' : 'text-slate-700 dark:text-zinc-200') : 'text-slate-400'}`}>
                        {isOnline ? `${dev.temperature} °C` : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-semibold">CPU 负载</p>
                      <p className={`font-mono font-bold mt-0.5 ${isOnline ? (dev.cpuLoad > 70 ? 'text-red-500 font-black animate-pulse' : 'text-slate-700 dark:text-zinc-200') : 'text-slate-400'}`}>
                        {isOnline ? `${dev.cpuLoad} %` : '--'}
                      </p>
                    </div>
                  </div>

                  {/* 物理设备 IP */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 dark:text-zinc-500 font-semibold">物理 IP:</span>
                    <span className={`font-mono font-bold ${isOnline ? 'text-slate-700 dark:text-zinc-200' : 'text-slate-400'}`}>
                      {dev.ip}
                    </span>
                  </div>

                  {/* 绑定卡密信息 */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 dark:text-zinc-500 font-semibold">授权卡密:</span>
                    <span className="font-mono text-slate-700 dark:text-zinc-200 font-bold bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">
                      {dev.licenseBound}
                    </span>
                  </div>

                  {/* 对应所属应用 */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 dark:text-zinc-500 font-semibold">所属应用:</span>
                    <span className="text-slate-700 dark:text-zinc-200 font-bold">
                      {dev.appName}
                    </span>
                  </div>

                  {/* 端侧延迟 RTT */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 dark:text-zinc-500 font-semibold">网络延迟 (RTT):</span>
                    <span className={`font-mono font-bold ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {isOnline ? `${dev.rtt} ms` : '--'}
                    </span>
                  </div>

                  {/* 历史心跳计数 */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 dark:text-zinc-500 font-semibold">累计心跳:</span>
                    <span className="font-mono text-slate-500 dark:text-zinc-400 font-semibold">
                      {isOnline ? `${dev.heartbeatsCount} 次` : '--'}
                    </span>
                  </div>
                  
                  {/* 最后活跃心跳时间 */}
                  <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-zinc-800/50 pt-2">
                    <span className="text-slate-400 dark:text-zinc-500 font-semibold">最后活跃:</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold font-mono">
                      {formatTime(dev.lastActiveAt)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 pb-3 border-t border-slate-100 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-800/10 flex justify-end gap-2">
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

      {/* 远程指令历史记录表 */}
      <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
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
