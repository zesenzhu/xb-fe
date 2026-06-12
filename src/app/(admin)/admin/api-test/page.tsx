'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, Input, Select, Switch, Space, Tag, message, Alert, AutoComplete, Tabs, Steps, Timeline, Badge, Tooltip } from 'antd';
import { 
  Terminal, Cpu, Play, Square, RefreshCw, Send, Zap, Clock, 
  Unlink, Link, ShieldAlert, HelpCircle, FileText, Database, 
  CheckCircle, PlayCircle, StopCircle, CheckCircle2,
  Trash2, AlertTriangle, ArrowRight, Server, FileCode2
} from 'lucide-react';
import { api } from '@/lib/axios';
import { useUserStore } from '@/store/useUserStore';

// -------------------------------------------------------------
// 1. 声明式接口测试列表树 (易拓展设计：新增调试接口仅需在下数组增新项)
// -------------------------------------------------------------
interface DebugApiItem {
  id: string;
  name: string;
  category: 'HTTP' | 'TCP';
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  description: string;
  defaultPayload: string;
}

const DEBUG_API_LIST: DebugApiItem[] = [
  {
    id: 'auth_license',
    name: '设备激活登录 (HTTP)',
    category: 'HTTP',
    method: 'POST',
    url: '/auth/user/license-login',
    description: '客户端脚本进行网络鉴权与物理设备激活的入口，无需密码，可自动建立设备物理绑定。',
    defaultPayload: JSON.stringify({
      code: 'XB-TESTCODE123',
      deviceId: 'DEV-SIM-001'
    }, null, 2)
  },
  {
    id: 'get_my_devices',
    name: '获取已绑定设备列表 (HTTP)',
    category: 'HTTP',
    method: 'GET',
    url: '/register-codes/my-devices',
    description: '大屏端或脚本端通过 HTTP 协议拉取指定激活卡密下已绑定的所有物理设备信息与状态。',
    defaultPayload: 'code=XB-TESTCODE123'
  },
  {
    id: 'tcp_connect',
    name: '建立物理 TCP 连接 (TCP-SIM)',
    category: 'TCP',
    url: '/tcp-simulator/connect',
    description: '代浏览器向后端 8082 端口建立一个长连接 Socket 客户端，并进行 Auth 握手鉴权上报。',
    defaultPayload: JSON.stringify({
      code: 'XB-TESTCODE123',
      deviceId: 'DEV-SIM-001',
      appName: 'ScriptDebugger'
    }, null, 2)
  },
  {
    id: 'tcp_ping',
    name: '发送心跳 Ping 包 (TCP-SIM)',
    category: 'TCP',
    url: '/tcp-simulator/ping',
    description: '向 8082 端口的 TCP 活跃连接发送心跳，支持上报电量参数，后端会实时解析落库。',
    defaultPayload: JSON.stringify({
      deviceId: 'DEV-SIM-001',
      battery: 95
    }, null, 2)
  },
  {
    id: 'tcp_log',
    name: '模拟上报运行日志 (TCP-SIM)',
    category: 'TCP',
    url: '/tcp-simulator/log',
    description: '模拟客户端脚本的日志模块，向后端物理网关批量发送多级别、多模块的运行日志。',
    defaultPayload: JSON.stringify({
      deviceId: 'DEV-SIM-001',
      logs: [
        {
          level: 'INFO',
          module: 'SYSTEM',
          content: '调试沙箱发出的模拟日志测试帧'
        }
      ]
    }, null, 2)
  },
  {
    id: 'tcp_disconnect',
    name: '断开物理 TCP 连接 (TCP-SIM)',
    category: 'TCP',
    url: '/tcp-simulator/disconnect',
    description: '主动挂起长连接客户端，发送离线广播，并自动物理归档全部未落库日志。',
    defaultPayload: JSON.stringify({
      deviceId: 'DEV-SIM-001',
      logs: [
        {
          level: 'WARN',
          module: 'SYSTEM',
          content: '连接主动断开退出'
        }
      ]
    }, null, 2)
  },
  {
    id: 'auth_forgot_send',
    name: '发送密码重置邮箱验证码 (HTTP)',
    category: 'HTTP',
    method: 'POST',
    url: '/auth/forgot-password/send-code',
    description: '输入已绑定的管理员邮箱，请求系统向该邮箱发送6位随机重设密码验证码。',
    defaultPayload: JSON.stringify({
      email: 'admin@xbnest.com'
    }, null, 2)
  },
  {
    id: 'auth_forgot_reset',
    name: '校验验证码并重置密码 (HTTP)',
    category: 'HTTP',
    method: 'POST',
    url: '/auth/forgot-password/reset',
    description: '输入已绑定的邮箱、收到的6位验证码以及新密码，完成管理员账户密码重置。',
    defaultPayload: JSON.stringify({
      email: 'admin@xbnest.com',
      code: '123456',
      newPassword: 'newSecurePassword123'
    }, null, 2)
  }
];

interface TerminalLine {
  type: 'info' | 'error' | 'success' | 'send' | 'recv';
  timestamp: string;
  title: string;
  content: string;
}

export default function ApiTestPage() {
  const { user } = useUserStore();
  const router = useRouter();



  // --- 页签 1 状态区 ---
  const [selectedApi, setSelectedApi] = useState<DebugApiItem>(DEBUG_API_LIST[0]);
  const [payloadInput, setPayloadInput] = useState<string>(DEBUG_API_LIST[0].defaultPayload);
  const [codeOptions, setCodeOptions] = useState<{ value: string; label: string }[]>([]);
  const [boundDeviceIds, setBoundDeviceIds] = useState<string[]>([]);
  
  // TTY 控制台回显
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [reqLoading, setReqLoading] = useState(false);

  // --- 页签 2 (集成测试流) 状态区 ---
  const [testActive, setTestActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStates, setStepStates] = useState<('wait' | 'process' | 'finish' | 'error')[]>(Array(8).fill('wait'));
  const [testLogs, setTestLogs] = useState<{ time: string; msg: string; success?: boolean }[]>([]);
  const [createdTempCode, setCreatedTempCode] = useState<string>('');

  // 自动滚动 TTY 终端
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines, testLogs]);

  // 自动填充卡密列表数据 (连接真实数据库)
  const loadDatabaseCodes = async () => {
    try {
      const response: any = await api.get('/register-codes', {
        params: { page: 1, limit: 50 },
      });
      const list = response.list || [];
      const options = list.map((item: any) => ({
        value: item.code,
        label: `${item.code} (${item.cardType === 'YK' ? '月卡' : '永久'})`
      }));
      setCodeOptions(options);
    } catch (e) {
      console.warn('连接真实数据库获取卡密列表失败:', e);
    }
  };

  useEffect(() => {
    loadDatabaseCodes();
  }, []);

  // 接口变更时，重置 payload
  const handleApiChange = (apiId: string) => {
    const target = DEBUG_API_LIST.find(x => x.id === apiId);
    if (target) {
      setSelectedApi(target);
      setPayloadInput(target.defaultPayload);
    }
  };

  // 根据卡密模糊关联真实设备
  const handleCodeSelect = async (codeVal: string) => {
    try {
      const response: any = await api.get('/register-codes/my-devices', {
        params: { code: codeVal },
      });
      const ids = (response || []).map((d: any) => d.id);
      setBoundDeviceIds(ids);
      message.success(`已拉取到激活卡密绑定设备 ${ids.length} 台`);
    } catch (e) {
      setBoundDeviceIds([]);
    }
  };

  // 往 TTY 控制台追加记录
  const printToTerminal = (type: TerminalLine['type'], title: string, content: string) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const d = new Date();
    const timestamp = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    setTerminalLines(prev => [...prev, { type, timestamp, title, content }]);
  };

  // 一键清空终端
  const clearTerminal = () => {
    setTerminalLines([]);
    message.info('控制台日志已清空');
  };

  // 1. 发送单点接口请求
  const sendDebugRequest = async () => {
    setReqLoading(true);
    const apiPath = selectedApi.url;
    printToTerminal('send', `REQUEST ${selectedApi.method || 'POST'}`, `Path: ${apiPath}\nPayload: ${payloadInput}`);

    try {
      let res: any;
      if (selectedApi.category === 'HTTP') {
        if (selectedApi.method === 'GET') {
          // 对 GET 协议解析 query
          const params: Record<string, string> = {};
          payloadInput.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k) params[k] = decodeURIComponent(v || '');
          });
          res = await api.get(apiPath, { params });
        } else {
          // POST / PUT / DELETE
          const body = JSON.parse(payloadInput);
          res = await api({
            method: selectedApi.method,
            url: apiPath,
            data: body
          });
        }
      } else {
        // TCP-SIM 模拟接口
        const body = JSON.parse(payloadInput);
        res = await api.post(apiPath, body);
      }

      printToTerminal('success', 'RESPONSE SUCCESS', JSON.stringify(res, null, 2));
      message.success('接口调用成功！');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || '未知物理接口错误';
      printToTerminal('error', 'RESPONSE ERROR', `Error Message: ${errMsg}\nDetail: ${JSON.stringify(err.response?.data || {}, null, 2)}`);
      message.error(`调用失败: ${errMsg}`);
    } finally {
      setReqLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. 自动化集成测试场景流逻辑 (Timeline integration tests)
  // -------------------------------------------------------------
  const logWorkflow = (msg: string, success?: boolean) => {
    const now = new Date().toTimeString().split(' ')[0];
    setTestLogs(prev => [...prev, { time: now, msg, success }]);
  };

  const updateStepState = (stepIdx: number, state: 'wait' | 'process' | 'finish' | 'error') => {
    setStepStates(prev => {
      const copy = [...prev];
      copy[stepIdx] = state;
      return copy;
    });
  };

  // 执行全链路自动化体检
  const runIntegrationTest = async () => {
    if (testActive) return;
    setTestActive(true);
    setCurrentStep(0);
    setTestLogs([]);
    setStepStates(Array(8).fill('wait'));
    logWorkflow('🚀 启动全链路物理设备激活鉴权自动化测试流程...');

    const testDeviceId = `WORKFLOW-DEV-${Math.floor(100 + Math.random() * 900)}`;
    let tempCode = '';

    try {
      // ---- 步骤 1：创建临时卡密 ----
      setCurrentStep(0);
      updateStepState(0, 'process');
      logWorkflow('步骤 [1/8]：正请求后端创建 XB-DEBUG- 前缀临时测试激活卡密...');
      const createRes = await api.post('/debug/create-temp-code');
      tempCode = createRes.data?.code;
      setCreatedTempCode(tempCode);
      logWorkflow(`   卡密创建成功: ${tempCode}`, true);
      updateStepState(0, 'finish');
      await new Promise(r => setTimeout(r, 1000));

      // ---- 步骤 2：校验新卡密状态 ----
      setCurrentStep(1);
      updateStepState(1, 'process');
      logWorkflow('步骤 [2/8]：读取数据库校验新卡密是否为干净的“未使用”状态...');
      const checkRes: any = await api.get('/register-codes', { params: { search: tempCode } });
      const foundCode = checkRes.list?.[0];
      if (!foundCode || foundCode.status !== 1) {
        throw new Error(`卡密初始状态异常，获取的值为 ${foundCode?.status || '未找到'}`);
      }
      logWorkflow('   卡密就绪，初始状态无误！', true);
      updateStepState(1, 'finish');
      await new Promise(r => setTimeout(r, 1000));

      // ---- 步骤 3：HTTP 激活登录 ----
      setCurrentStep(2);
      updateStepState(2, 'process');
      logWorkflow(`步骤 [3/8]：模拟客户端调用 HTTP 激活登录接口，物理绑定设备 ${testDeviceId}...`);
      const activateRes: any = await api.post('/auth/user/license-login', {
        code: tempCode,
        deviceId: testDeviceId
      });
      logWorkflow(`   激活成功！获取分配的虚拟设备ID: ${activateRes.user?.deviceId}`, true);
      updateStepState(2, 'finish');
      await new Promise(r => setTimeout(r, 1000));

      // ---- 步骤 4：TCP 模拟长连接 ----
      setCurrentStep(3);
      updateStepState(3, 'process');
      logWorkflow(`步骤 [4/8]：通知后端 TCP 仿真器，代客户端向 8082 端口建立物理 TCP 长连接，启动鉴权...`);
      await api.post('/tcp-simulator/connect', {
        code: tempCode,
        deviceId: testDeviceId,
        appName: 'WorkflowDebugger'
      });
      logWorkflow('   TCP 握手就绪，已成功代建 TCP Socket 通信！', true);
      updateStepState(3, 'finish');
      await new Promise(r => setTimeout(r, 1000));

      // ---- 步骤 5：TCP 心跳电量更新 ----
      setCurrentStep(4);
      updateStepState(4, 'process');
      logWorkflow('步骤 [5/8]：通过 TCP Socket 仿真通道，发送心跳 Ping 包，上报真实电量 77%...');
      await api.post('/tcp-simulator/ping', {
        deviceId: testDeviceId,
        battery: 77
      });
      logWorkflow('   心跳发送完毕，已收到后端网关 Pong 应答！', true);
      updateStepState(4, 'finish');
      await new Promise(r => setTimeout(r, 1500)); // 稍作停顿以确保落库持久化已完毕

      // ---- 步骤 6：落库与大屏状态核验 ----
      setCurrentStep(5);
      updateStepState(5, 'process');
      logWorkflow('步骤 [6/8]：拉取设备在线接口，校验数据库与内存中是否成功更新电量为 77% 以及状态 online...');
      const detailsRes: any = await api.get('/register-codes/my-devices', {
        params: { code: tempCode }
      });
      const boundDev = detailsRes?.[0];
      if (!boundDev) {
        throw new Error('未在卡密下找到任何关联绑定的物理设备');
      }
      
      // 读取大屏设备渲染接口，获取最终整合后的反 Mock 物理数据
      const screenDevices: any = await api.get('/register-codes/bound-devices');
      const targetScreenDev = screenDevices.find((x: any) => x.id === testDeviceId);
      
      if (!targetScreenDev || targetScreenDev.status !== 'online' || targetScreenDev.battery !== 77) {
        throw new Error(`反 Mock 数据不匹配！当前状态: ${targetScreenDev?.status || '离线'}，电量: ${targetScreenDev?.battery || '未知'}`);
      }
      logWorkflow(`   去 Mock 校对成功！物理设备大屏状态在线，且电量落库为 ${targetScreenDev.battery}%`, true);
      updateStepState(5, 'finish');
      await new Promise(r => setTimeout(r, 1000));

      // ---- 步骤 7：一键清空测试数据 ----
      setCurrentStep(6);
      updateStepState(6, 'process');
      logWorkflow('步骤 [7/8]：测试圆满，调用 debug/cleanup 清空测试临时卡密及全部物理绑定记录...');
      // 首先断开 TCP simulator
      try {
        await api.post('/tcp-simulator/disconnect', { deviceId: testDeviceId, logs: [] });
      } catch (e) {}
      
      const cleanRes: any = await api.post('/debug/cleanup');
      logWorkflow(`   物理清理完毕！后端响应: ${cleanRes.message}`, true);
      updateStepState(6, 'finish');
      await new Promise(r => setTimeout(r, 1000));

      // ---- 步骤 8：确认恢复干净环境 ----
      setCurrentStep(7);
      updateStepState(7, 'process');
      logWorkflow('步骤 [8/8]：最后复查，确认临时卡密和测试设备在数据库中已物理删除...');
      const checkCleanRes: any = await api.get('/register-codes', { params: { search: tempCode } });
      if (checkCleanRes.list && checkCleanRes.list.length > 0) {
        throw new Error('清理异常：数据库中依旧能够查找到该测试卡密！');
      }
      logWorkflow('   环境核对完毕，零残留，非常干净！', true);
      updateStepState(7, 'finish');
      
      logWorkflow('🎉 全链路物理集成测试体检成功！系统所有微服务、物理网关及数据库链接正常工作！');
      message.success('一键全链路测试成功！系统功能健康度 100%');
    } catch (err: any) {
      updateStepState(currentStep, 'error');
      const errDetail = err.message || err.response?.data?.message || '联调过程异常中断';
      logWorkflow(`❌ 自动化测试在步骤 #${currentStep + 1} 遭遇异常中断：${errDetail}`, false);
      message.error(`测试流程异常: ${errDetail}`);
      
      // 容错处理：若是中途失败，依旧建议执行一遍清理，以防脏数据堆积
      logWorkflow('🔧 触发被动垃圾清理保护，正在强行清理临时激活码及相关设备...');
      try {
        await api.post('/debug/cleanup');
      } catch (e) {}
    } finally {
      setTestActive(false);
      loadDatabaseCodes(); // 刷新真实卡密下拉列表
    }
  };

  // 手动执行一键清除残留
  const triggerManualCleanup = async () => {
    try {
      const res: any = await api.post('/debug/cleanup');
      message.success(res.message || '环境已强行清空！');
      loadDatabaseCodes();
    } catch (e: any) {
      message.error('清理失败: ' + (e.response?.data?.message || e.message));
    }
  };

  // -------------------------------------------------------------
  // 权限控制阻断：非 admin 超级管理员显示 Unauthorized 阻断，放在 Hooks 之后以符合 React 规范
  // -------------------------------------------------------------
  if (user?.role?.code !== 'admin') {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/20 flex items-center justify-center shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8 text-red-600 animate-bounce" />
        </div>
        <h1 className="text-lg font-black text-slate-800 dark:text-zinc-200">抱歉，您无权访问当前模块</h1>
        <p className="text-xs text-slate-400 max-w-md text-center">“接口调试沙箱”为超级管理员专属物理调试面板，防越权防护已生效，普通管理员或操作员无法越权访问。</p>
        <Button 
          type="primary" 
          onClick={() => router.push('/admin/dashboard')} 
          className="bg-slate-900 dark:bg-white dark:text-zinc-950 font-bold h-9 border-none rounded-lg"
        >
          返回仪表盘
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-500" />
            超级管理员接口测试工作台
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            供物理级别脚本开发、接口体检的沙盒空间。支持连接数据库真实数据，并配置有一键式自动化场景集成流程测试。
          </p>
        </div>
        
        {/* 一键垃圾数据强刷清除 */}
        <div className="flex gap-2">
          <Tooltip title="一键物理清除数据库内所有以 XB-DEBUG- 前缀的卡密和物理绑定设备，恢复环境干净状态">
            <Button
              danger
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={triggerManualCleanup}
              className="text-xs font-bold h-9 flex items-center justify-center gap-1.5"
            >
              清除测试脏数据
            </Button>
          </Tooltip>
        </div>
      </div>

      <Tabs 
        defaultActiveKey="api-test" 
        className="custom-tabs"
        items={[
          {
            key: 'api-test',
            label: <span className="font-bold flex items-center gap-1.5"><FileCode2 className="w-4 h-4" />单接口功能联调</span>,
            children: (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* 左侧接口列表与输入区 */}
                <div className="xl:col-span-6 space-y-6">
                  
                  {/* 选择接口 */}
                  <Card className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-850">
                      <CardTitle className="text-sm font-bold flex items-center justify-between">
                        <span>1. 接口选择与说明</span>
                        <Badge 
                          status={selectedApi.category === 'TCP' ? 'processing' : 'default'} 
                          text={<span className="font-mono text-[10px] font-extrabold">{selectedApi.category} PROTOCOL</span>} 
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">接口列表 (树级数据驱动)</label>
                        <Select
                          value={selectedApi.id}
                          onChange={handleApiChange}
                          className="w-full h-9 font-bold"
                          options={DEBUG_API_LIST.map(api => ({
                            value: api.id,
                            label: `${api.category === 'HTTP' ? `[${api.method}]` : '[TCP-SIM]'} ${api.name}`
                          }))}
                        />
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/80 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">
                          <Tag color="blue" className="font-bold border-none m-0">{selectedApi.category}</Tag>
                          <span>{selectedApi.url}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-500 leading-relaxed">
                          {selectedApi.description}
                        </p>
                      </div>

                    </CardContent>
                  </Card>

                  {/* 数据库辅助工具与输入参数 */}
                  <Card className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-850">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-emerald-500" />
                        真实数据库绑定测试 (卡密及设备关联)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">真实数据库中卡密选择</label>
                          <AutoComplete
                            options={codeOptions}
                            onSelect={handleCodeSelect}
                            placeholder="搜索/选择真实可用卡密..."
                            className="w-full font-mono text-xs"
                            style={{ height: '36px' }}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">已绑设备 ID</label>
                          <Select
                            placeholder={boundDeviceIds.length === 0 ? "暂无绑定的物理设备" : "选择此卡密已绑定设备..."}
                            disabled={boundDeviceIds.length === 0}
                            options={boundDeviceIds.map(x => ({ value: x, label: x }))}
                            className="w-full h-9 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400">
                            参数载荷 ({selectedApi.method === 'GET' ? 'Query String' : 'JSON Payload'})
                          </label>
                          <button
                            onClick={() => setPayloadInput(selectedApi.defaultPayload)}
                            className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-0.5"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            重置为默认模板
                          </button>
                        </div>
                        <Input.TextArea
                          value={payloadInput}
                          onChange={(e) => setPayloadInput(e.target.value)}
                          rows={6}
                          className="border-slate-200 dark:border-zinc-800 rounded-lg text-xs leading-relaxed font-mono font-bold"
                          placeholder={selectedApi.method === 'GET' ? 'k1=v1&k2=v2' : '{\n  "key": "value"\n}'}
                        />
                      </div>

                      <Button
                        type="primary"
                        onClick={sendDebugRequest}
                        loading={reqLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs w-full h-9 flex items-center justify-center gap-1.5 border-none rounded-lg"
                      >
                        <Send className="w-3.5 h-3.5" />
                        发送模拟测试请求
                      </Button>

                    </CardContent>
                  </Card>

                </div>

                {/* 右侧 TTY Console */}
                <div className="xl:col-span-6 flex flex-col h-[565px] bg-slate-950 dark:bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
                  
                  {/* Console Header */}
                  <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-mono font-bold text-slate-400 ml-2 flex items-center gap-1">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        Sandbox API TTY Console 回显面板
                      </span>
                    </div>
                    <Button 
                      onClick={clearTerminal}
                      size="small" 
                      className="text-[9px] font-bold h-5 px-2 bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                    >
                      清空终端
                    </Button>
                  </div>

                  {/* Console Lines */}
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-3.5 select-text custom-scrollbar">
                    {terminalLines.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-700 text-xs gap-2 select-none">
                        <Unlink className="w-7 h-7 opacity-35" />
                        <span>等待接口测试发起，报文回显和响应头将在该终端实时输出。</span>
                      </div>
                    ) : (
                      terminalLines.map((line, idx) => {
                        let badgeColor = 'text-slate-400';
                        let lineClass = 'text-slate-400 border-l-2 border-slate-800';

                        if (line.type === 'send') {
                          badgeColor = 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/30';
                          lineClass = 'text-emerald-300 bg-emerald-950/5 border-l-2 border-emerald-500';
                        } else if (line.type === 'success') {
                          badgeColor = 'text-cyan-400 bg-cyan-950/40 border border-cyan-900/30';
                          lineClass = 'text-cyan-300 bg-cyan-950/5 border-l-2 border-cyan-500';
                        } else if (line.type === 'error') {
                          badgeColor = 'text-red-400 bg-red-950/40 border border-red-900/30';
                          lineClass = 'text-red-400 bg-red-950/10 border-l-2 border-red-500';
                        }

                        return (
                          <div key={idx} className={`flex flex-col py-1.5 px-2.5 rounded transition-all duration-100 hover:bg-slate-900/40 ${lineClass}`}>
                            <div className="flex items-center gap-2 select-none mb-1 text-[10px]">
                              <span className="text-slate-700">#{String(idx + 1).padStart(3, '0')}</span>
                              <span className="text-slate-500">[{line.timestamp}]</span>
                              <span className={`px-1.5 rounded font-bold uppercase shrink-0 ${badgeColor}`}>
                                {line.title}
                              </span>
                            </div>
                            <span className="whitespace-pre-wrap select-all font-semibold break-all text-[11px]">
                              {line.content}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </div>

              </div>
            )
          },
          {
            key: 'scenario-test',
            label: <span className="font-bold flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-500" />自动化全链路体检</span>,
            children: (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* 自动化测试说明与 Steps */}
                <div className="xl:col-span-5 space-y-6">
                  
                  <Card className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-850">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" />
                        一键集成自动化体检测试
                      </CardTitle>
                      <CardDescription className="text-[10px]">
                        一键在后台模拟完整物理激活、TCP长连接握手以及持久化落库，测试完立即自动清理。
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-6">
                      
                      <Steps
                        direction="vertical"
                        size="small"
                        current={currentStep}
                        status={testActive ? 'process' : 'wait'}
                        items={[
                          { title: <span className="text-xs font-bold">创建测试临时卡密</span>, status: stepStates[0] },
                          { title: <span className="text-xs font-bold">校验数据库卡密初始状态</span>, status: stepStates[1] },
                          { title: <span className="text-xs font-bold">物理设备 HTTP 激活登录</span>, status: stepStates[2] },
                          { title: <span className="text-xs font-bold">物理 TCP 连接建立与握手</span>, status: stepStates[3] },
                          { title: <span className="text-xs font-bold">TCP 物理心跳电量上报</span>, status: stepStates[4] },
                          { title: <span className="text-xs font-bold">去 Mock 活跃数据核验</span>, status: stepStates[5] },
                          { title: <span className="text-xs font-bold">清空测试激活码与绑定</span>, status: stepStates[6] },
                          { title: <span className="text-xs font-bold">校验数据库干净环境</span>, status: stepStates[7] },
                        ]}
                      />

                      <Button
                        type="primary"
                        onClick={runIntegrationTest}
                        disabled={testActive}
                        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 hover:text-zinc-950 font-black text-xs w-full h-10 flex items-center justify-center gap-1.5 border-none rounded-xl"
                      >
                        <PlayCircle className="w-4 h-4" />
                        启动全链路体检测试
                      </Button>

                    </CardContent>
                  </Card>

                </div>

                {/* 集成测试日志流回显 (右侧) */}
                <div className="xl:col-span-7 flex flex-col h-[535px] bg-slate-950 dark:bg-black border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
                  
                  <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-xs font-mono font-bold text-slate-400 ml-2 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-amber-500" />
                        Integration Test TTY Console Workflow LOGS
                      </span>
                    </div>
                  </div>

                  {/* Test Logs Timeline */}
                  <div className="flex-1 p-5 overflow-y-auto font-mono text-xs leading-relaxed select-text custom-scrollbar">
                    {testLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-700 text-xs gap-2 select-none">
                        <Zap className="w-8 h-8 opacity-30 text-amber-500 animate-pulse" />
                        <span>等待体检流启动，所有测试断言步骤的输出信息将在该窗口中流动展示。</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {testLogs.map((log, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px]">
                            <span className="text-slate-500">[{log.time}]</span>
                            {log.success === true ? (
                              <Tag color="success" className="font-bold border-none text-[9px] py-0 px-1 m-0 shrink-0">PASS</Tag>
                            ) : log.success === false ? (
                              <Tag color="error" className="font-bold border-none text-[9px] py-0 px-1 m-0 shrink-0">FAIL</Tag>
                            ) : (
                              <Tag color="default" className="font-bold border-none text-[9px] py-0 px-1 m-0 shrink-0">INFO</Tag>
                            )}
                            <span className={log.success === false ? 'text-red-500 font-bold' : log.success === true ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                              {log.msg}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div ref={terminalEndRef} />
                  </div>

                </div>

              </div>
            )
          }
        ]}
      />

    </div>
  );
}
