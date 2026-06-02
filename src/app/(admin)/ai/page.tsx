'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, Input as AntInput, Select as AntSelect, Slider, Space, message, Timeline } from 'antd';
import { Bot, Send, User, Settings, Sparkles, Brain, Cpu, CheckCircle2, Loader2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageItem {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  thinking?: string; // 深度思考链内容 (如 DeepSeek-R1 模型的 think 标签)
  isStreaming?: boolean;
}

export default function AiPage() {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: '1',
      sender: 'agent',
      content: '您好！我是您的系统自动化 AI 代理。我可以帮您排查设备日志、批量生成激活码、或者向端侧设备下发复杂指令。请问有什么我可以帮您的？',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [temp, setTemp] = useState(0.7);
  const [model, setModel] = useState('DeepSeek-R1');
  
  // 模拟 Agent 任务多步执行节点
  const [agentSteps, setAgentSteps] = useState<Array<{ title: string; description: string; status: 'finish' | 'process' | 'wait' }>>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: MessageItem = {
      id: Math.random().toString(),
      sender: 'user',
      content: inputText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    // 1. 初始化 Agent 物理任务执行步骤进度 (侧边栏动态联动)
    setAgentSteps([
      { title: '理解自然语言意图', description: '正在解析指令...', status: 'process' },
      { title: '匹配系统核心工具', description: '等待意图确认', status: 'wait' },
      { title: '执行物理系统操作', description: '等待上游输出', status: 'wait' },
    ]);

    // 2. 模拟 AI 深度思考并流式返回内容
    setTimeout(() => {
      // 步骤 1 完成
      setAgentSteps([
        { title: '理解自然语言意图', description: '成功识别指令 [ 重置过热设备 ]', status: 'finish' },
        { title: '匹配系统核心工具', description: '正在调度 MQTT 推送 API...', status: 'process' },
        { title: '执行物理系统操作', description: '等待上游输出', status: 'wait' },
      ]);

      const streamMsgId = Math.random().toString();
      const newAgentMsg: MessageItem = {
        id: streamMsgId,
        sender: 'agent',
        thinking: '用户请求“重置系统内负载最高且处于过热状态的机器人设备”。根据系统自检模型：当前 BAICHUAN-ROBOT-02 温度高达 42°C，CPU 负载 78.2%，处于过热告警阶段。调用 MQTT 下发工具: publish("payload/cmd/REBOOT", { device: "BAICHUAN-ROBOT-02" }).',
        content: '',
        isStreaming: true,
      };

      setMessages((prev) => [...prev, newAgentMsg]);

      // 模拟流式打字机输出
      const fullText = '我已经成功识别并帮您处理了该指令！我发现系统内目前负载最高且处于过热预警中的设备为 `BAICHUAN-ROBOT-02` (温度: 42°C, 负载: 78.2%)。我已经通过 MQTT 物理信道向其下发了 `REBOOT` 硬件重置指令。设备已成功接收并已在 1.5 秒前进入物理重启链路。您可以在“MQTT设备监控”或“脚本运行日志”中看到实时心跳变化。';
      let currentIdx = 0;
      
      const interval = setInterval(() => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === streamMsgId) {
              const nextContent = fullText.slice(0, currentIdx + 4);
              currentIdx += 4;
              const finished = currentIdx >= fullText.length;
              if (finished) {
                clearInterval(interval);
                setLoading(false);
                // 步骤 2, 3 完成
                setAgentSteps([
                  { title: '理解自然语言意图', description: '成功识别指令 [ 重置过热设备 ]', status: 'finish' },
                  { title: '匹配系统核心工具', description: '成功匹配工具 [ mqtt_publish ]', status: 'finish' },
                  { title: '执行物理系统操作', description: '成功对 BAICHUAN-ROBOT-02 触发 REBOOT 成功', status: 'finish' },
                ]);
              }
              return {
                ...msg,
                content: nextContent,
                isStreaming: !finished,
              };
            }
            return msg;
          })
        );
      }, 50);

    }, 2000); // 模拟 2 秒的思考延迟 (展示深度思考 think 框)
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-9rem)] animate-in fade-in duration-300 select-none">
      
      {/* 1. 左侧：模型调试参数控制面板 */}
      <div className="lg:col-span-1 space-y-4 flex flex-col">
        {/* 参数设定卡片 */}
        <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-500" />
              模型推理参数
            </CardTitle>
            <CardDescription className="text-[10px]">调节 Agent 运行时温度与多路提示词模版</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* 模型选择 */}
            <div className="space-y-1.5">
              <span className="text-slate-400 font-semibold">选择决策核心:</span>
              <AntSelect
                value={model}
                onChange={(val) => setModel(val)}
                className="w-full h-8"
                options={[
                  { value: 'DeepSeek-R1', label: 'DeepSeek-R1 (深度思考)' },
                  { value: 'DeepSeek-V3', label: 'DeepSeek-V3 (极速响应)' },
                  { value: 'GPT-4o', label: 'OpenAI GPT-4o' },
                  { value: 'Claude-3.5', label: 'Claude 3.5 Sonnet' },
                ]}
              />
            </div>

            {/* 温度滑块 */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-400">
                <span>思维创造力 (Temp):</span>
                <span className="font-mono text-slate-700 dark:text-zinc-200">{temp}</span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={temp}
                onChange={(val) => setTemp(val)}
                className="my-2"
              />
            </div>
            
            {/* 系统提示词 */}
            <div className="space-y-1.5">
              <span className="text-slate-400 font-semibold">系统提示词 (System Prompt):</span>
              <AntInput.TextArea
                value="你是一个部署在 NestJS 上游的前端 AI 代理。你可以通过直接下发工具来获取 PostgreSQL 状态，控制 Redis QPS 注册码，下发 MQTT 机器人命令。"
                rows={4}
                className="text-[11px] leading-normal"
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* 动态 Agent 物理任务步骤追踪线 (仅在有步骤时展示) */}
        {agentSteps.length > 0 && (
          <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex-1 overflow-y-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-emerald-500" />
                Agent 步骤追踪链
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Timeline
                items={agentSteps.map((step) => ({
                  title: <span className="text-xs font-bold">{step.title}</span>,
                  description: <span className="text-[10px] text-slate-400 font-semibold block mt-1">{step.description}</span>,
                  color: step.status === 'finish' ? 'green' : step.status === 'process' ? 'blue' : 'gray',
                  dot: step.status === 'process' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> : undefined,
                }))}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. 右侧：主 AI Streaming 对话调试区 */}
      <div className="lg:col-span-3 flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        
        {/* 对话栏头部 */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">AI Agent 对话沙盒</h2>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                已挂载系统工具包：[mqtt_publish, db_query, code_redis_limit]
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30 font-bold uppercase font-mono">
            {model}
          </span>
        </div>

        {/* 聊天消息区 */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 h-[400px] custom-scrollbar bg-slate-50/30 dark:bg-zinc-950/10 select-text">
          {messages.map((msg) => {
            const isAgent = msg.sender === 'agent';

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[85%] animate-in fade-in duration-300",
                  isAgent ? "mr-auto items-start" : "ml-auto flex-row-reverse items-start"
                )}
              >
                {/* 头像 */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                  isAgent
                    ? "bg-slate-900 border-slate-950 text-white dark:bg-white dark:border-white dark:text-black"
                    : "bg-slate-200 border-slate-300 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
                )}>
                  {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* 消息气泡主体 */}
                <div className="space-y-1.5">
                  {/* 1. DeepSeek-R1 深度思维链 think 盒子展示 */}
                  {isAgent && msg.thinking && (
                    <div className="bg-slate-100 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400 max-w-full font-mono relative overflow-hidden">
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 font-bold mb-1.5 select-none text-[10px]">
                        <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        思维过程 (DeepSeek-R1 Thoughts)
                      </div>
                      <div className="italic select-all">{msg.thinking}</div>
                    </div>
                  )}

                  {/* 2. 对话正文气泡 */}
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed font-medium shadow-sm border",
                    isAgent
                      ? "bg-white border-slate-200 text-slate-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200"
                      : "bg-slate-900 border-slate-950 text-white dark:bg-white dark:border-white dark:text-black font-semibold"
                  )}>
                    {msg.content}
                    
                    {/* 流式打印光标特效 */}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-4.5 bg-slate-900 dark:bg-white ml-1 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* 底层输入栏 */}
        <CardFooter className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/20 select-none">
          <div className="flex items-center gap-2 w-full">
            <AntInput
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="对 AI Agent 下发指令，如：检查 baichuan-02 设备，若过热则帮我重置..."
              className="h-10 border-slate-200 dark:border-zinc-800"
              onPressEnter={handleSend}
              disabled={loading}
            />
            <Button
              type="primary"
              disabled={loading || !inputText.trim()}
              onClick={handleSend}
              className="h-10 w-10 flex items-center justify-center shrink-0 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 p-0 border-none rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardFooter>
      </div>
    </div>
  );
}
