'use client';

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import {
  Terminal,
  Play,
  Pause,
  Download,
  Search,
  ArrowDown,
  Activity,
  Wifi,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Battery,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUserStore, DeviceItem } from '@/store/useUserStore'
import { api } from '@/lib/axios'

interface LogLine {
  id: string
  time: string
  level: 'INFO' | 'WARN' | 'ERROR'
  module: string
  content: string
}

function DeviceLogDetail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramDeviceId = searchParams.get('deviceId') || searchParams.get('deviceid')
  const { user, activeDevices, subscribeLogs } = useUserStore()

  const [activeDeviceId, setActiveDeviceId] = useState<string>('')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [isLive, setIsLive] = useState(true) // 是否实时接收日志流
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<
    'ALL' | 'INFO' | 'WARN' | 'ERROR'
  >('ALL')
  const [autoScroll, setAutoScroll] = useState(true)
  const [controlsCollapsed, setControlsCollapsed] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [listHeight, setListHeight] = useState(480)

  // 校验状态
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(true)

  // 1. 动态监听容器大小，保证高度在移动端与折叠状态下自适应
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640
      if (controlsCollapsed) {
        // 折叠控制栏后，大幅拉升日志视窗高度
        setListHeight(isMobile ? 540 : 640)
      } else {
        setListHeight(isMobile ? 380 : 480)
      }
    }

    handleResize() // 挂载时立即调用一次
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [controlsCollapsed])

  // 1.5 安全校验路由传参中的 deviceId 是否合法
  useEffect(() => {
    const validateDevice = async () => {
      if (!user?.username) {
        setIsValidating(false)
        setIsValid(false)
        return
      }
      try {
        const response = (await api.get('/register-codes/my-devices', {
          params: { code: user.username },
        })) as DeviceItem[]
        const devices = response || []
        if (!paramDeviceId) {
          setIsValid(false)
        } else {
          const exists = devices.some((d: DeviceItem) => d.id === paramDeviceId)
          setIsValid(exists)
          if (exists) {
            setActiveDeviceId(paramDeviceId)
          }
        }
      } catch (err) {
        console.error('[Logs Validation] 验证物理设备 ID 失败:', err)
        setIsValid(false)
      } finally {
        setIsValidating(false)
      }
    }
    validateDevice()
  }, [paramDeviceId, user?.username])

  // 2. 真实接入后端历史日志接口
  useEffect(() => {
    const fetchHistory = async () => {
      if (!activeDeviceId || !isValid) return
      try {
        const response: any = await api.get('/logs/history', {
          params: {
            deviceId: activeDeviceId,
            level: levelFilter,
            page: 1,
            limit: 100, // 默认拉取最新的 100 条历史日志
          },
        })
        if (response && response.list) {
          // 后端返回是时间倒序的（最新在最前），展示时我们需要将其反转为正序（最老在最前，最新在尾部）
          const sortedHistory = [...response.list].reverse()
          setLogs(sortedHistory)
        }
      } catch (err: any) {
        console.error('[Logs] 无法拉取历史归档日志:', err)
      }
    }

    fetchHistory()
  }, [activeDeviceId, levelFilter, isValid])

  // 3. 真实接入全局共享 stream 流的日志订阅机制
  useEffect(() => {
    if (!isLive || !activeDeviceId) return;

    // 订阅全局 layout sse 长连接转发过来的当前设备日志消息
    const unsubscribe = subscribeLogs((logPayload: any) => {
      if (logPayload.deviceId === activeDeviceId) {
        const freshLog: LogLine = {
          id: logPayload.id || Math.random().toString(),
          time: logPayload.time || new Date().toTimeString().split(' ')[0],
          level: logPayload.level || 'INFO',
          module: logPayload.module || 'CLIENT',
          content: logPayload.content || logPayload.message || '',
        };

        setLogs((prev) => {
          const next = [...prev, freshLog];
          if (next.length > 3000) {
            return next.slice(-3000);
          }
          return next;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isLive, activeDeviceId, subscribeLogs]);

  // 4. 关键字联合过滤 (配合级联级别的过滤)
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter
    const matchesSearch =
      searchQuery === '' ||
      log.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesLevel && matchesSearch
  })

  // 5. 自动滚动锁定
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll, filteredLogs.length])

  // 6. 导出本地日志文件下载
  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('当前无终端日志可导出')
      return
    }

    const logText = logs
      .map(
        (log) => `[${log.time}] [${log.level}] [${log.module}]: ${log.content}`,
      )
      .join('\n')

    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `xbnets_terminal_${activeDeviceId || 'device'}_${new Date().toISOString().slice(0, 10)}.log`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('本地运行日志已成功导出')
  }

  const currentDevice = activeDevices.find((d) => d.id === activeDeviceId)

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 font-sans">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-500 dark:text-zinc-550 font-mono tracking-wider animate-pulse">
          SECURITY VALIDATING...
        </p>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] px-4 font-sans animate-in fade-in duration-500 select-none">
        <div className="relative max-w-md w-full p-8 rounded-3xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 shadow-2xl text-center space-y-6 overflow-hidden">
          {/* 背景流光 */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-red-500/10 dark:bg-red-500/5 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl" />
          
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/5 animate-bounce">
            <Terminal className="w-8 h-8" />
          </div>
          
          <div className="space-y-2 relative z-10">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-wider">
              未检测到合法的物理设备
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-550 leading-relaxed font-semibold">
              当前请求的物理设备 ID 无效、已解绑或无权访问。请检查路由参数或返回控制台。
            </p>
            {paramDeviceId && (
              <p className="text-[10px] font-mono bg-slate-105 dark:bg-zinc-950 p-2 rounded-lg text-slate-400 dark:text-zinc-550 break-all border border-slate-200 dark:border-zinc-850">
                请求 ID: {paramDeviceId}
              </p>
            )}
          </div>
          
          <div className="pt-2 relative z-10">
            <Button
              onClick={() => router.push('/user/device')}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs tracking-widest shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              返回我的设备列表
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 select-none">
      {/* 1. 面板标题头与折叠控制开关 */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800/40 pb-2.5">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/user/device')}
            className="text-[11px] font-black h-7 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-zinc-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回物理设备
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
          <h1 className="text-sm sm:text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span>{currentDevice ? currentDevice.name : '设备详情'}</span>
            {currentDevice && (
              <span className={cn(
                "text-[10px] font-extrabold px-1.5 py-0.5 rounded border tracking-wider select-none shrink-0",
                currentDevice.status === 'online'
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
              )}>
                {currentDevice.status === 'online' ? '在线' : '离线'}
              </span>
            )}
          </h1>
          {controlsCollapsed && (
            <span className="text-[9px] bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/60 px-1.5 py-0.5 rounded text-slate-500 dark:text-zinc-500 font-extrabold uppercase animate-in fade-in duration-200">
              已收起控制栏
            </span>
          )}
        </div>

        {/* 折叠切换按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setControlsCollapsed(!controlsCollapsed)}
          className="text-[11px] font-bold gap-1 h-7 px-2 sm:px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-850"
        >
          {controlsCollapsed ? (
            <>
              展开控制
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              收起控制
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </div>

      {/* 2. 可被折叠的控制按钮与过滤器面板 */}
      {!controlsCollapsed && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {/* 数据导出与暂停按钮 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div />

            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <Button
                variant={isLive ? 'default' : 'outline'}
                onClick={() => setIsLive(!isLive)}
                className={cn(
                  'text-[11px] font-bold gap-1.5 h-8.5 px-3 rounded-xl transition-all active:scale-97 border',
                  isLive
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 hover:text-zinc-950 shadow-lg shadow-emerald-500/10 border-transparent'
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/80',
                )}
              >
                {isLive ? (
                  <>
                    <Pause className="w-3 h-3" />
                    暂停实时更新
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    恢复实时更新
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleExport}
                className="text-[11px] font-bold gap-1.5 h-8.5 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/80 hover:text-slate-900 dark:hover:text-white"
              >
                <Download className="w-3 h-3" />
                导出日志
              </Button>
            </div>
          </div>

          {/* 高级联合检索过滤器 - 移动端高级双配色布局 */}
          <div className="bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-2.5 sm:p-4 flex flex-col md:flex-row gap-2.5 sm:gap-4 items-center justify-between shadow-sm dark:shadow-lg">
            {/* 左侧筛选与搜索 - 移动端并排 */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={levelFilter}
                onChange={(e: any) => setLevelFilter(e.target.value)}
                className="h-9 px-2 w-1/2 sm:w-36 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 text-xs rounded-xl focus:outline-none focus:border-slate-400 dark:focus:border-zinc-700 font-bold"
              >
                <option
                  value="ALL"
                  className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-300"
                >
                  全部告警等级
                </option>
                <option
                  value="INFO"
                  className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-300"
                >
                  INFO (正常自检)
                </option>
                <option
                  value="WARN"
                  className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-300"
                >
                  WARN (异常波动)
                </option>
                <option
                  value="ERROR"
                  className="bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-300"
                >
                  ERROR (致命故障)
                </option>
              </select>

              <div className="relative w-1/2 sm:w-56">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-zinc-650" />
                <Input
                  placeholder="关键字检索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 h-9 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-850 dark:text-white text-xs placeholder-slate-400 dark:placeholder-zinc-750 focus-visible:ring-emerald-500/25 rounded-xl"
                />
              </div>
            </div>

            {/* 右侧自动滚动定位与行数 - 移动端横向紧凑分布 */}
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto border-t border-slate-100 dark:border-zinc-800/30 pt-2.5 md:pt-0 md:border-0">
              <Button
                variant="ghost"
                onClick={() => setAutoScroll(!autoScroll)}
                className={cn(
                  'text-[10px] h-7 font-bold border rounded-xl px-2.5 transition-colors',
                  autoScroll
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-500',
                )}
              >
                <ArrowDown
                  className={cn('w-3 h-3 mr-1', autoScroll && 'animate-bounce')}
                />
                {autoScroll ? '锁定尾部' : '开启滚屏'}
              </Button>
              <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-extrabold flex items-center gap-1.5 uppercase select-text">
                <Activity className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                缓冲区: {filteredLogs.length} 行
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. 极速 react-window 虚拟列表大屏 */}

      <div className="bg-zinc-950 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Terminal Header */}
        <div className="bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-850/60 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
          {/* 左侧控制台标识 */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500/80" />
            <span className="w-2 h-2 rounded-full bg-amber-500/80" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 font-extrabold ml-1.5 whitespace-nowrap">
              xbxx-vlogs-console
            </span>
          </div>

          {/* 右侧设备通道信息面板（唯一物理设备） */}
          {currentDevice && (
            <div className="flex flex-row items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t border-slate-200 dark:border-zinc-850/60 pt-2 sm:pt-0 sm:border-t-0 text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-500">
              <span className="flex items-center gap-1">
                <Wifi
                  className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    currentDevice.status === 'online'
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-zinc-650',
                  )}
                />
                <span className="text-[10px] text-slate-450 dark:text-zinc-450">物理链路:</span>
                <span className={cn(
                  "px-1 py-0.2 rounded text-[9px] uppercase font-extrabold",
                  currentDevice.status === 'online' ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500 bg-slate-500/10'
                )}>
                  {currentDevice.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                </span>
              </span>
              
              <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

              {currentDevice.ip && (
                <span className="flex items-center gap-1">
                  <span>IP:</span>
                  <span className="text-slate-700 dark:text-zinc-300 font-semibold">{currentDevice.ip}</span>
                </span>
              )}

              {currentDevice.battery !== undefined && (
                <>
                  <div className="h-3 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />
                  <span className="flex items-center gap-1">
                    <Battery className={cn("w-3.5 h-3.5", currentDevice.battery < 20 ? "text-rose-500 animate-pulse" : "text-sky-500")} />
                    <span>电量:</span>
                    <span className="text-slate-700 dark:text-zinc-300 font-semibold">{currentDevice.battery}%</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 原生日志渲染视窗 */}
        <div
          ref={scrollContainerRef}
          style={{ height: listHeight }}
          className="w-full bg-black/90 relative overflow-y-auto"
        >
          {filteredLogs.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 text-xs gap-1.5 animate-in fade-in duration-200">
              <Terminal className="w-7 h-7 opacity-35" />
              <span>暂无匹配此条件的实时诊断数据</span>
            </div>
          ) : (
            <div className="py-2 divide-y divide-zinc-900/10">
              {filteredLogs.map((log, index) => {
                let levelClass = 'text-sky-400'
                let contentClass = 'text-zinc-300'

                if (log.level === 'ERROR') {
                  levelClass =
                    'text-red-500 bg-red-950/40 border border-red-900/30 px-1 rounded font-black'
                  contentClass = 'text-red-400 bg-red-950/10 font-bold'
                } else if (log.level === 'WARN') {
                  levelClass = 'text-amber-500 font-bold'
                  contentClass = 'text-amber-300'
                }

                return (
                  <div
                    key={log.id || index}
                    className="flex flex-col py-2 px-3 hover:bg-zinc-900/30 transition-colors select-text font-mono text-[11px] leading-relaxed"
                  >
                    {/* 第一行：序号、时间、级别、模块 */}
                    <div className="flex items-center gap-2 select-none">
                      <span className="text-zinc-700 w-8 text-right font-bold">
                        #{String(index + 1).padStart(3, '0')}
                      </span>
                      <span className="text-zinc-500">[{log.time}]</span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] shrink-0 font-bold tracking-wider',
                          levelClass,
                        )}
                      >
                        {log.level}
                      </span>
                      <span className="text-emerald-500 font-bold">
                        [{log.module}]
                      </span>
                    </div>
                    {/* 第二行：具体日志正文（换行显示，不直接接在info后面，不缩略） */}
                    <div
                      className={cn(
                        'pl-10 mt-1 select-all break-all whitespace-pre-wrap',
                        contentClass,
                      )}
                    >
                      {log.content}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UserLogPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-mono">Initializing log terminal...</div>}>
      <DeviceLogDetail />
    </React.Suspense>
  )
}
