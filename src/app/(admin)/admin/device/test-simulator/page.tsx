'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, Input, Select, Switch, Space, Tag, message, Alert, AutoComplete } from 'antd';
import { 
  Terminal, Cpu, Play, Square, RefreshCw, Send, Zap, Clock, 
  Unlink, Link, ShieldCheck, HelpCircle, FileText, Database, AlertCircle 
} from 'lucide-react';
import { api } from '@/lib/axios';

interface RegisterCodeOption {
  id: string;
  code: string;
  deviceId: string | null;
  status: string;
  currentActivations: number;
  maxActivations: number;
}

interface TerminalLine {
  direction: 'send' | 'receive' | 'system';
  timestamp: string;
  payload: string;
}

const LOG_TEMPLATES: Record<string, string[]> = {
  SYSTEM: [
    '脚本引擎环境初始化成功，适配物理屏幕 1080x2400',
    '内存健康自检完成：空闲物理内存 1.42 GB',
    '正在加载第一章游戏行为树配置文件...',
    '成功挂载物理驱动底座，虚拟输入设备侦听就绪'
  ],
  NETWORK: [
    '心跳数据包上报正常，Ping 物理延迟 24ms',
    '与后端 8082 物理连接通道已重连就绪',
    '检测到网络延时突增至 125ms，正触发被动逃逸规避',
    'MQTT 长连接协议握手就绪，侦听设备主题控制成功'
  ],
  LOGIC: [
    '循环挂机轮询中：当前检测到背包剩余空间 45%',
    '已成功完成第 10 次“每日签到任务”，领取金币 x1000',
    '在场景 [暮色森林] 中自动寻路至坐标点 (241, 982)',
    '自动检测到关卡副本结算面板，正在点击“重新开始”按钮'
  ],
  VISION: [
    '未发现“主界面充值图标”，开始第 3 次重试检索...',
    '模板匹配结果：匹配度 94.6%，确认“商城入口按钮”物理坐标 (510, 89)',
    'OCR 文字识别异常：背景像素对比度不足，正在进行图像二值化增强',
    '未匹配到预期任务栏标题，当前关卡判定为 [战斗中] 状态'
  ],
  EXCEPTION: [
    '端侧设备物理内存占用过高（82%），尝试触发自动清理机制',
    'TCP 长连接发生 1 次网络瞬断，正在尝试静默重连',
    '检测到界面出现非预期广告弹窗，开始执行自动避让动作',
    '心跳上报出现单次包丢失，第 1 次被动重发中'
  ],
  CRITICAL: [
    '游戏程序遭遇闪退异常，已回退至操作系统主桌面',
    '脚本核心抛出空指针异常 (NullPointerException)，脚本崩溃中断',
    '物理按键驱动失去响应，检测到设备掉线告警！',
    '系统激活防封机制，判定前台行为异常，执行紧急自毁退出进程'
  ]
};

export default function TestSimulatorPage() {
  const [codeOptions, setCodeOptions] = useState<RegisterCodeOption[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [boundDeviceIds, setBoundDeviceIds] = useState<string[]>([]);

  // 连接状态: 'disconnected' | 'connecting' | 'connected'
  const [connState, setConnState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [pingLoading, setPingLoading] = useState<boolean>(false);
  
  // 报文发送配置
  const [logLevel, setLogLevel] = useState<'INFO' | 'WARN' | 'ERROR'>('INFO');
  const [logModule, setLogModule] = useState<string>('SYSTEM');
  const [logContent, setLogContent] = useState<string>('');
  
  // 定时发送配置
  const [autoSend, setAutoSend] = useState<boolean>(false);
  const [autoSendInterval, setAutoSendInterval] = useState<number>(3); // 秒
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // TTY 终端回显
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalPollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 异步获取当前激活码已经绑定的所有设备 ID 列表
  const fetchBoundDevices = async (code: string) => {
    try {
      const response: any = await api.get('/register-codes/my-devices', {
        params: { code },
      });
      const ids = (response || []).map((d: any) => d.id);
      setBoundDeviceIds(ids);
      
      // 如果有绑定的物理设备，默认带入第一个已绑定的设备
      if (ids.length > 0) {
        setDeviceId(ids[0]);
      } else {
        setDeviceId(`DEV-SIM-${Math.floor(100 + Math.random() * 900)}`);
      }
    } catch (err) {
      setBoundDeviceIds([]);
      setDeviceId(`DEV-SIM-${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  // 1. 初始化拉取可用注册码列表
  useEffect(() => {
    const loadCodes = async () => {
      try {
        const response: any = await api.get('/register-codes', {
          params: { page: 1, limit: 500 },
        });
        const list = response.list || [];
        
        // 自适应排序优化：让 XB-TEST 前缀的测试卡与当前有绑定设备的活跃卡置顶，方便管理员测试
        const sorted = [...list].sort((a: any, b: any) => {
          const aIsTest = a.code.startsWith('XB-TEST') ? 1 : 0;
          const bIsTest = b.code.startsWith('XB-TEST') ? 1 : 0;
          if (aIsTest !== bIsTest) return bIsTest - aIsTest;
          
          return b.currentActivations - a.currentActivations;
        });

        setCodeOptions(sorted);
        
        // 默认带入第一个测试码
        const testCode = sorted.find((o: any) => o.code.startsWith('XB-TEST'));
        if (testCode) {
          setSelectedCode(testCode.code);
          fetchBoundDevices(testCode.code);
        } else if (sorted.length > 0) {
          setSelectedCode(sorted[0].code);
          fetchBoundDevices(sorted[0].code);
        }
      } catch (err) {
        message.error('加载系统注册码数据失败');
      }
    };
    loadCodes();
    
    return () => {
      stopAutoSend();
      stopTerminalPolling();
    };
  }, []);

  // 更改注册码时，同步带入绑定的设备
  const handleCodeChange = (val: string) => {
    setSelectedCode(val);
    fetchBoundDevices(val);
  };

  // 生成一条随机模版日志
  const handleGenerateTemplate = (moduleName = logModule, levelName = logLevel) => {
    const templates = LOG_TEMPLATES[moduleName] || LOG_TEMPLATES.SYSTEM;
    const randomIdx = Math.floor(Math.random() * templates.length);
    setLogContent(templates[randomIdx]);
  };

  // 在选择不同的模块时，自动触发一次模板生成，优化体验
  const handleModuleChange = (val: string) => {
    setLogModule(val);
    // 自动适配日志等级推荐
    let recommendedLevel: 'INFO' | 'WARN' | 'ERROR' = 'INFO';
    if (val === 'VISION') recommendedLevel = 'WARN';
    if (val === 'EXCEPTION') recommendedLevel = 'WARN';
    if (val === 'CRITICAL') recommendedLevel = 'ERROR';
    setLogLevel(recommendedLevel);
    handleGenerateTemplate(val, recommendedLevel);
  };

  // 自动滚动 TTY 终端
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines]);

  // 开始轮询 TTY 终端交互记录
  const startTerminalPolling = (devId: string) => {
    stopTerminalPolling();
    const poll = async () => {
      try {
        const res: any = await api.get('/tcp-simulator/terminal', {
          params: { deviceId: devId },
        });
        if (res) {
          setTerminalLines(res.history || []);
          if (!res.online && connState === 'connected') {
            // 后端判定连接已丢失
            setConnState('disconnected');
            stopAutoSend();
            stopTerminalPolling();
            message.warning('模拟客户端长连接已在后端异常关闭');
          }
        }
      } catch (err) {
        console.error('轮询 TTY 终端日志出错', err);
      }
    };
    
    // 立即执行一次，随后每 1.5 秒轮询
    poll();
    terminalPollTimerRef.current = setInterval(poll, 1500);
  };

  const stopTerminalPolling = () => {
    if (terminalPollTimerRef.current) {
      clearInterval(terminalPollTimerRef.current);
      terminalPollTimerRef.current = null;
    }
  };

  // 发起连接
  const handleConnect = async () => {
    if (!selectedCode || !deviceId) {
      message.error('请填写完整的注册码和设备ID！');
      return;
    }
    
    setActionLoading(true);
    setConnState('connecting');
    try {
      const res: any = await api.post('/tcp-simulator/connect', {
        code: selectedCode,
        deviceId,
        appName: 'XB-SimulatorDevice',
      });
      message.success(res.message || 'TCP 模拟器长连接握手鉴权成功！');
      setConnState('connected');
      
      // 开启 TTY 轮询
      startTerminalPolling(deviceId);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || '握手鉴权失败');
      setConnState('disconnected');
    } finally {
      setActionLoading(false);
    }
  };

  // 发送心跳
  const handlePing = async () => {
    if (connState !== 'connected') return;
    setPingLoading(true);
    try {
      await api.post('/tcp-simulator/ping', { deviceId });
      message.success('心跳 Ping 指令已发送，请在终端回显中查看 Pong 响应');
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || '发送心跳包失败');
    } finally {
      setPingLoading(false);
    }
  };

  // 单次发送日志
  const handleSendLog = async () => {
    if (connState !== 'connected') return;
    if (!logContent.trim()) {
      message.error('日志内容不能为空！');
      return;
    }

    try {
      await api.post('/tcp-simulator/log', {
        deviceId,
        logs: [
          {
            level: logLevel,
            module: logModule,
            content: logContent,
          }
        ]
      });
      message.success('实时日志数据包发送成功');
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || '发送日志数据包失败');
    }
  };

  // 断开物理连接
  const handleDisconnect = async () => {
    if (connState !== 'connected') return;
    setActionLoading(true);
    
    // 模拟客户端退出前发送 exit_log 归档日志进行最后落库
    const exitLogs = [
      {
        level: 'WARN' as const,
        module: 'SYSTEM',
        content: '模拟器发出退出指令，客户端连接开始安全挂起...',
      },
      {
        level: 'INFO' as const,
        module: 'SYSTEM',
        content: `客户端进程生存周期结束，准备销毁 TCP 通道，归档时间: ${new Date().toLocaleString()}`,
      }
    ];

    try {
      const res: any = await api.post('/tcp-simulator/disconnect', {
        deviceId,
        logs: exitLogs,
      });
      message.success(res.message || '模拟 TCP 物理连接已断开并归档日志！');
      
      // 断开本地 TTY 轮询和定时器
      setConnState('disconnected');
      stopAutoSend();
      stopTerminalPolling();
      
      // 最终拉取一次确保完整
      setTimeout(async () => {
        try {
          const res: any = await api.get('/tcp-simulator/terminal', { params: { deviceId } });
          if (res) setTerminalLines(res.history || []);
        } catch (e) {}
      }, 300);

    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || '断开连接失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 启动自动模拟轮询发送日志 (压力测试)
  const startAutoSend = () => {
    if (autoSendTimerRef.current) return;
    
    const intervalMs = autoSendInterval * 1000;
    const send = async () => {
      // 从 6 大日志分类里随机选取一个模块
      const modules = Object.keys(LOG_TEMPLATES);
      const randomModule = modules[Math.floor(Math.random() * modules.length)];
      
      // 根据模块自动推荐级别
      let level: 'INFO' | 'WARN' | 'ERROR' = 'INFO';
      if (randomModule === 'VISION' || randomModule === 'EXCEPTION') level = 'WARN';
      if (randomModule === 'CRITICAL') level = 'ERROR';
      
      const templates = LOG_TEMPLATES[randomModule];
      const randomContent = templates[Math.floor(Math.random() * templates.length)];

      try {
        await api.post('/tcp-simulator/log', {
          deviceId,
          logs: [
            {
              level,
              module: randomModule,
              content: randomContent,
            }
          ]
        });
      } catch (err) {
        console.error('自动定时模拟发送日志出错', err);
      }
    };

    // 立即发一条，然后定时发
    send();
    autoSendTimerRef.current = setInterval(send, intervalMs);
    setAutoSend(true);
    message.success(`自动日志模拟器已启动，每 ${autoSendInterval} 秒自动生成并上传一条日志包`);
  };

  const stopAutoSend = () => {
    if (autoSendTimerRef.current) {
      clearInterval(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    setAutoSend(false);
  };

  const handleAutoSendChange = (checked: boolean) => {
    if (checked) {
      if (connState !== 'connected') {
        message.warning('请先成功连接物理 TCP Socket 后再开启自动模拟！');
        return;
      }
      startAutoSend();
    } else {
      stopAutoSend();
      message.info('定时模拟日志上报已关闭');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 标题 */}
      <div>
        <h1 className="text-xl font-black">TCP 长连接日志模拟测试终端</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          专为网页端设计的物理级 TCP Client 仿真调试面板。代浏览器向后端 8082 TCP 端口建立物理 Socket 连接，测试权限激活与高并发流式管道。
        </p>
      </div>

      <Alert
        message={<span className="font-bold text-xs">全链路高保真物理沙箱模式说明</span>}
        description={
          <div className="text-[11px] leading-relaxed mt-1 text-slate-600 dark:text-zinc-400">
            由于网页内无法直接调用 TCP Socket。该面板点击<strong>“建立物理连接”</strong>后，NestJS 会在服务器主进程中代为建立一个真实的本地 TCP Socket 客户端直连 8082 端口，并在内存 Map 中保存句柄。所有您的发送指令、心跳、归档帧都会通过这个真实的 Socket 发出，能够 100% 还原并验证底层网络协议的健壮性。
          </div>
        }
        type="info"
        showIcon
        icon={<HelpCircle className="w-5 h-5 text-indigo-500" />}
        className="border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20"
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* 左侧控制区 (占 5 栏) */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* 长连接配置与建立卡片 */}
          <Card className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                  物理连接控制器 (TCP Client Simulator)
                </span>
                
                {/* 物理连接状态标签 */}
                {connState === 'connected' ? (
                  <Tag color="success" className="font-bold border-none px-2.5 py-0.5 rounded-full flex items-center gap-1 m-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    已连接 (ONLINE)
                  </Tag>
                ) : connState === 'connecting' ? (
                  <Tag color="warning" className="font-bold border-none px-2.5 py-0.5 rounded-full flex items-center gap-1 m-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin" />
                    连接握手中...
                  </Tag>
                ) : (
                  <Tag color="default" className="font-bold border-none px-2.5 py-0.5 rounded-full flex items-center gap-1 m-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    断开离线 (OFFLINE)
                  </Tag>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1.5">1. 测试授权注册码 (系统注入)</label>
                <Select
                  showSearch
                  value={selectedCode || undefined}
                  onChange={handleCodeChange}
                  placeholder="搜索并选择用于鉴权的注册激活卡..."
                  className="w-full h-9"
                  disabled={connState !== 'disconnected'}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={codeOptions.map(o => ({
                    value: o.code,
                    label: `${o.code} (已绑定: ${o.currentActivations}/${o.maxActivations} 台)`,
                  }))}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1.5">2. 虚拟模拟设备ID (支持选择已绑定设备或输入新设备ID进行测试)</label>
                <AutoComplete
                  value={deviceId}
                  onChange={(val) => setDeviceId(val)}
                  options={boundDeviceIds.map(id => ({ value: id, label: `已绑定: ${id}` }))}
                  placeholder="选择已绑定设备，或直接输入新设备ID..."
                  className="w-full font-mono font-bold"
                  style={{ height: '36px' }}
                  disabled={connState !== 'disconnected'}
                />
              </div>

              <div className="pt-2 flex gap-3">
                {connState !== 'connected' ? (
                  <Button
                    type="primary"
                    onClick={handleConnect}
                    loading={actionLoading || connState === 'connecting'}
                    className="bg-slate-900 hover:bg-slate-800 text-xs font-bold flex-1 h-9 flex items-center justify-center gap-1.5 rounded-lg"
                  >
                    <Play className="w-3.5 h-3.5" />
                    建立物理 TCP 连接
                  </Button>
                ) : (
                  <Button
                    danger
                    type="primary"
                    onClick={handleDisconnect}
                    loading={actionLoading}
                    className="text-xs font-bold flex-1 h-9 flex items-center justify-center gap-1.5 rounded-lg"
                  >
                    <Square className="w-3.5 h-3.5" />
                    安全断开并自动归档
                  </Button>
                )}

                <Button
                  onClick={handlePing}
                  disabled={connState !== 'connected'}
                  loading={pingLoading}
                  className="text-xs font-bold border-slate-200 dark:border-zinc-800 h-9 flex items-center justify-center gap-1 rounded-lg px-4"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  发送心跳 (Ping)
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* 报文日志手动/定时上报卡片 */}
          <Card className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                测试报文流发生器 (Log Payload Generator)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1.5">日志级别 (Level)</label>
                  <Select
                    value={logLevel}
                    onChange={(val) => setLogLevel(val)}
                    className="w-full h-9 font-bold"
                    options={[
                      { value: 'INFO', label: 'INFO (普通日志)' },
                      { value: 'WARN', label: 'WARN (异常警告)' },
                      { value: 'ERROR', label: 'ERROR (致命错误)' },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1.5">行为模块 (Module)</label>
                  <Select
                    value={logModule}
                    onChange={handleModuleChange}
                    className="w-full h-9 font-bold font-mono"
                    options={[
                      { value: 'SYSTEM', label: 'SYSTEM (主框架初始化)' },
                      { value: 'NETWORK', label: 'NETWORK (网络与延时)' },
                      { value: 'LOGIC', label: 'LOGIC (挂机业务逻辑)' },
                      { value: 'VISION', label: 'VISION (图色与文字识别)' },
                      { value: 'EXCEPTION', label: 'EXCEPTION (环境警报)' },
                      { value: 'CRITICAL', label: 'CRITICAL (致命崩溃)' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-400">日志消息文本 (Content)</label>
                  <button
                    onClick={() => handleGenerateTemplate()}
                    className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-0.5 outline-none hover:underline"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    随机替换拟真文案
                  </button>
                </div>
                <Input.TextArea
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  placeholder="请输入要模拟上报的日志信息，或点击上方随机生成模板..."
                  rows={3}
                  className="border-slate-200 dark:border-zinc-800 rounded-lg text-xs leading-relaxed font-semibold"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">自动定时模拟日志流</span>
                  <span className="text-[10px] text-slate-400 leading-normal">
                    每隔 {autoSendInterval} 秒自动生成一条拟真报文推送，以测试吞吐稳定性
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={autoSendInterval}
                    onChange={(val) => {
                      setAutoSendInterval(val);
                      if (autoSend) {
                        stopAutoSend();
                        startAutoSend();
                      }
                    }}
                    size="small"
                    style={{ width: 70 }}
                    options={[
                      { value: 1, label: '1s' },
                      { value: 3, label: '3s' },
                      { value: 5, label: '5s' },
                      { value: 10, label: '10s' },
                    ]}
                  />
                  <Switch
                    checked={autoSend}
                    onChange={handleAutoSendChange}
                    disabled={connState !== 'connected'}
                  />
                </div>
              </div>

              <Button
                type="primary"
                onClick={handleSendLog}
                disabled={connState !== 'connected' || !logContent.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold w-full h-9 flex items-center justify-center gap-1.5 rounded-lg"
              >
                <Send className="w-3.5 h-3.5" />
                单次发送实时日志包 (log_chunk)
              </Button>

            </CardContent>
          </Card>

        </div>

        {/* 右侧 TTY 终端报文流监视器 (占 7 栏) */}
        <div className="xl:col-span-7 flex flex-col h-[675px] bg-slate-950 dark:bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
          
          {/* TTY 顶部控制栏 */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono font-bold text-slate-400 ml-2 flex items-center gap-1">
                <Terminal className="w-4 h-4 text-emerald-400" />
                TCP Simulator TTY Console [127.0.0.1:8082]
              </span>
            </div>
            {connState === 'connected' ? (
              <span className="text-[10px] font-mono font-bold text-emerald-400 animate-pulse flex items-center gap-1">
                <Clock className="w-3 h-3 animate-spin" />
                STREAM ACTIVE
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold text-slate-500">
                CONNECTION INACTIVE
              </span>
            )}
          </div>

          {/* 终端内容区 */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-3 select-text custom-scrollbar">
            {terminalLines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 text-xs gap-2 select-none">
                <Unlink className="w-8 h-8 opacity-45" />
                <span>物理长连接已关闭或离线，等待连接后回显握手报文数据帧。</span>
              </div>
            ) : (
              terminalLines.map((line, idx) => {
                let badgeColor = 'text-slate-400';
                let directionText = ' [SYSTEM] ';
                let lineClass = 'text-slate-400';

                if (line.direction === 'send') {
                  badgeColor = 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/30';
                  directionText = ' >>> SEND: ';
                  lineClass = 'text-emerald-300 bg-emerald-950/5';
                } else if (line.direction === 'receive') {
                  badgeColor = 'text-cyan-400 bg-cyan-950/40 border border-cyan-900/30';
                  directionText = ' <<< RECV: ';
                  lineClass = 'text-cyan-300 bg-cyan-950/5';
                }

                return (
                  <div key={idx} className={`flex items-start gap-2.5 py-1 px-1.5 rounded transition-all duration-100 hover:bg-slate-900/40 ${lineClass}`}>
                    <span className="text-slate-700 w-8 text-right select-none text-[10px]">
                      {(idx + 1).toString().padStart(3, '0')}
                    </span>
                    <span className="text-slate-500 select-none">[{line.timestamp}]</span>
                    <span className={`px-1 rounded font-bold text-[10px] uppercase tracking-wider shrink-0 ${badgeColor}`}>
                      {directionText.trim()}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap select-all font-semibold break-all">
                      {line.payload}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

      </div>

    </div>
  );
}
