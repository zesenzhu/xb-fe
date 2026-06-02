'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, Modal, Form, Select, Input, Tag, Space, message, Table } from 'antd';
import { Cpu, Power, Play, RotateCcw, AlertTriangle, ArrowDownCircle, CheckCircle, ShieldAlert } from 'lucide-react';

interface DeviceItem {
  id: string;
  name: string;
  mac: string;
  ip: string;
  status: 'online' | 'offline';
  temperature: number;
  cpuUsage: number;
  activeScript: string;
  lastHeartbeat: string;
}

const mockDevices: DeviceItem[] = [
  { id: '1', name: 'BAICHUAN-ROBOT-01', mac: '08:A3:E2:0F:91:BC', ip: '192.168.10.101', status: 'online', temperature: 36, cpuUsage: 25.5, activeScript: 'auto_hunt.js', lastHeartbeat: '刚刚' },
  { id: '2', name: 'BAICHUAN-ROBOT-02', mac: '08:A3:E2:0F:91:BD', ip: '192.168.10.102', status: 'online', temperature: 42, cpuUsage: 78.2, activeScript: 'gather_resources.js', lastHeartbeat: '2秒前' },
  { id: '3', name: 'TEST-SIMULATOR-03', mac: '00:15:5D:01:C2:A8', ip: '172.22.40.15', status: 'online', temperature: 31, cpuUsage: 5.0, activeScript: '自检挂机脚本', lastHeartbeat: '5秒前' },
  { id: '4', name: 'OFFLINE-ROBOT-04', mac: '08:A3:E2:0F:92:02', ip: '192.168.10.104', status: 'offline', temperature: 0, cpuUsage: 0, activeScript: '无', lastHeartbeat: '3小时前' },
];

export default function DevicePage() {
  const [devices, setDevices] = useState<DeviceItem[]>(mockDevices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null);
  const [form] = Form.useForm();
  
  // 模拟指令发布记录
  const [cmdLogs, setCmdLogs] = useState<Array<{ time: string; device: string; cmd: string; status: string }>>([
    { time: '14:30:10', device: 'BAICHUAN-ROBOT-01', cmd: 'UPDATE_SCRIPT', status: 'success' },
    { time: '14:28:44', device: 'BAICHUAN-ROBOT-02', cmd: 'REBOOT', status: 'success' },
  ]);

  const handleOpenCommand = (device: DeviceItem) => {
    setSelectedDevice(device);
    setIsModalOpen(true);
  };

  const handleSendCommand = (values: any) => {
    if (!selectedDevice) return;
    
    const newLog = {
      time: new Date().toTimeString().split(' ')[0],
      device: selectedDevice.name,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 头部标题 */}
      <div>
        <h1 className="text-xl font-black">MQTT 端侧设备监控大屏</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          实时监控端侧机器人传感器自检参数、监听心跳包、下发远程指令（MQTT Payload）以即时操控设备行径
        </p>
      </div>

      {/* 2. 在线设备动态卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {devices.map((dev) => {
          const isOnline = dev.status === 'online';

          return (
            <Card key={dev.id} className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
              {/* 卡片顶部：连接状态 */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 select-none">
                <span className="relative flex h-2.5 w-2.5">
                  {isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                </span>
                <span className={`text-[10px] font-black uppercase ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isOnline ? 'bg-slate-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-slate-100 text-slate-400'}`}>
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold truncate max-w-[130px]">{dev.name}</CardTitle>
                    <CardDescription className="text-[10px] font-mono">{dev.mac}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-2 text-xs">
                {/* 传感器数据 */}
                <div className="grid grid-cols-2 gap-2 border-y border-slate-100 dark:border-zinc-800 py-2.5">
                  <div>
                    <p className="text-slate-400 text-[10px] font-semibold">温度检测</p>
                    <p className={`font-bold mt-1 ${isOnline ? (dev.temperature > 40 ? 'text-amber-500 font-extrabold' : 'text-slate-700 dark:text-zinc-200') : 'text-slate-400'}`}>
                      {isOnline ? `${dev.temperature} °C` : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-semibold">CPU 负载</p>
                    <p className={`font-bold mt-1 ${isOnline ? (dev.cpuUsage > 70 ? 'text-red-500 font-black animate-pulse' : 'text-slate-700 dark:text-zinc-200') : 'text-slate-400'}`}>
                      {isOnline ? `${dev.cpuUsage} %` : '--'}
                    </p>
                  </div>
                </div>

                {/* 脚本绑定 */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">活跃脚本:</span>
                  <span className={`font-bold ${isOnline ? 'text-slate-700 dark:text-zinc-200' : 'text-slate-400'}`}>
                    {dev.activeScript}
                  </span>
                </div>
                
                {/* 心跳时间 */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">心跳活跃:</span>
                  <span className="text-slate-500 font-semibold">{dev.lastHeartbeat}</span>
                </div>
              </CardContent>

              <CardFooter className="pt-2 border-t border-slate-100 dark:border-zinc-800/50 bg-slate-50/50 dark:bg-zinc-800/10 flex justify-end gap-2">
                <Button
                  type="primary"
                  size="small"
                  disabled={!isOnline}
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-bold text-[10px] h-7"
                  onClick={() => handleOpenCommand(dev)}
                >
                  远程指令
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* 3. 远程指令历史记录表 */}
      <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold tracking-tight">MQTT 命令下发回溯日志</CardTitle>
          <CardDescription className="text-xs">
            显示当前操作会话中向各端侧设备推送的 MQTT JSON 物理信道载荷指令投递状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 pb-3 text-slate-500 dark:text-zinc-400 text-xs">
                <th className="py-2 font-bold">下发时间</th>
                <th className="py-2 font-bold">目标设备</th>
                <th className="py-2 font-bold">指令载荷 (Topic/Command)</th>
                <th className="py-2 font-bold">下发状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {cmdLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                  <td className="py-2.5 text-xs text-slate-400 dark:text-zinc-500 font-semibold">{log.time}</td>
                  <td className="py-2.5 text-xs font-bold">{log.device}</td>
                  <td className="py-2.5">
                    <span className="font-mono text-xs text-indigo-500 font-semibold">
                      payload/cmd/{log.cmd}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                        <CheckCircle className="w-3.5 h-3.5" />
                        投递完成
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 animate-pulse">
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

      {/* 指令下发 Modal 抽屉 */}
      <Modal
        title={selectedDevice ? `对设备 [ ${selectedDevice.name} ] 远程控制` : '设备指令下发'}
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
            <Button type="primary" htmlType="submit" className="bg-slate-900 hover:bg-slate-800 flex items-center gap-1">
              <Play className="w-3.5 h-3.5" />
              推送指令
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
