import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Bell, HelpCircle, ListTodo } from 'lucide-react';
import './index.scss';

interface AlertConfigCardProps {
  code: string | undefined;
  
  configEmail: string;
  setConfigEmail: (val: string) => void;
  
  configOffline: boolean;
  setConfigOffline: (val: boolean) => void;
  
  configOfflineTimeout: number;
  setConfigOfflineTimeout: (val: number) => void;
  
  configLauncher: boolean;
  setConfigLauncher: (val: boolean) => void;
  
  configLocked: boolean;
  setConfigLocked: (val: boolean) => void;
  
  configVpn: boolean;
  setConfigVpn: (val: boolean) => void;
  
  configErrorLog: boolean;
  setConfigErrorLog: (val: boolean) => void;
  
  configMemoryLimit: number;
  setConfigMemoryLimit: (val: number) => void;
  
  configSaving: boolean;
  
  configPreventDuplicate: boolean;
  setConfigPreventDuplicate: (val: boolean) => void;
  
  configDuplicateAction: 'kick_new' | 'kick_old';
  setConfigDuplicateAction: (val: 'kick_new' | 'kick_old') => void;
  
  isPushSupported: boolean;
  isSubscribed: boolean;
  showGuide: boolean;
  isPushLoading: boolean;
  handleTogglePush: (checked: boolean) => Promise<void>;
  handleSaveAlertConfig: () => Promise<void>;
}

export const AlertConfigCard: React.FC<AlertConfigCardProps> = ({
  code,
  configEmail,
  setConfigEmail,
  configOffline,
  setConfigOffline,
  configOfflineTimeout,
  setConfigOfflineTimeout,
  configLauncher,
  setConfigLauncher,
  configLocked,
  setConfigLocked,
  configVpn,
  setConfigVpn,
  configErrorLog,
  setConfigErrorLog,
  configMemoryLimit,
  setConfigMemoryLimit,
  configSaving,
  configPreventDuplicate,
  setConfigPreventDuplicate,
  configDuplicateAction,
  setConfigDuplicateAction,
  isPushSupported,
  isSubscribed,
  showGuide,
  isPushLoading,
  handleTogglePush,
  handleSaveAlertConfig,
}) => {
  return (
    <Card className="alert-card border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
        <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-500" />
          设备异常警报推送中心
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
          针对挂机设备死机、报错、断开 VPN 等异常状况，提供多通道实时通知守护。
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-5 text-xs">
        {/* 卡密免输显示 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            当前授权卡密
          </label>
          <div className="card-mono-code">
            {code}
          </div>
        </div>

        {/* 通道一：邮件通知 */}
        <div className="channel-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-500" />
              <div>
                <p className="font-bold text-slate-800 dark:text-zinc-200">通道 1：邮件报警通知</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500">当发生异常时，向绑定的邮箱发送警报邮件</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <input
              type="text"
              placeholder="请输入您的报警接收邮箱，多个用分号(;)分隔"
              value={configEmail}
              onChange={(e) => setConfigEmail(e.target.value.trim())}
              className="text-input"
            />
          </div>
        </div>

        {/* 通道二：PWA 浏览器桌面推送 */}
        <div className="channel-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="font-bold text-slate-800 dark:text-zinc-200">通道 2：此浏览器的桌面推送 (PWA)</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500">即使关闭了网页，也能通过系统通知栏弹出气泡警告</p>
              </div>
            </div>
            <label className="switch-label">
              <input
                type="checkbox"
                checked={isSubscribed}
                disabled={isPushLoading || !isPushSupported}
                onChange={(e) => handleTogglePush(e.target.checked)}
              />
              <div className="switch-bg" />
            </label>
          </div>

          <div className="status-line">
            <span>当前浏览器订阅状态:</span>
            <span className="font-bold flex items-center gap-1">
              {!isPushSupported ? (
                <span className="text-rose-500">🔴 此浏览器不支持 PWA 推送</span>
              ) : Notification.permission === 'denied' ? (
                <span className="text-rose-500">🔴 未授权通知 (已被拒绝)</span>
              ) : isSubscribed ? (
                <span className="text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  🟢 已开启接收
                </span>
              ) : (
                <span className="text-slate-450 dark:text-zinc-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  ⚪ 未订阅桌面通知
                </span>
              )}
            </span>
          </div>

          {/* 手动允许通知开启引导 */}
          {(showGuide || !isSubscribed) && isPushSupported && (
            <div className="guide-box text-slate-650 dark:text-zinc-400 space-y-2">
              <p className="font-bold text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                桌面通知无法开启？请参考以下指引：
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[10px] leading-relaxed">
                <li>
                  <strong>Windows / macOS / Chrome 用户：</strong>
                  点击浏览器地址栏左侧的 <strong className="text-slate-700 dark:text-zinc-300">「锁 🔒」</strong> 图标或 <strong className="text-slate-700 dark:text-zinc-300">「设置 ⌥」</strong> 图标，找到“通知”并修改为“允许”。
                </li>
                <li>
                  <strong>iOS (苹果手机) 用户：</strong>
                  必须先在 Safari 浏览器中点击底部的 <strong className="text-indigo-500">「分享 📤」</strong> 按钮，选择 <strong className="text-indigo-500">「添加到主屏幕」</strong>。在桌面上打开添加到主屏幕的 App，再重新进入设置页面开启推送通知。
                </li>
                <li>
                  <strong>Android (安卓手机) 用户：</strong>
                  建议配合开启邮件报警通知，以在浏览器离线或休眠时获得更可靠的报警通知。
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* 订阅细粒度控制开关 */}
        <div className="config-section">
          <label className="section-title">
            <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
            订阅触发事件细分开关
          </label>
          
          <div className="config-list">
            {/* 1. 掉线 */}
            <div className="config-item with-input">
              <div className="item-main">
                <div>
                  <p className="font-bold text-slate-800 dark:text-zinc-200">1. 设备意外离线 (offline_unexpected)</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                    连续 {configOffline ? configOfflineTimeout : 10} 分钟未上报心跳且未正常退出时触发警告
                  </p>
                </div>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={configOffline}
                    onChange={(e) => setConfigOffline(e.target.checked)}
                  />
                  <div className="switch-bg" />
                </label>
              </div>
              {configOffline && (
                <div className="item-sub">
                  <span>判定时长 (2 - 60 分钟):</span>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={configOfflineTimeout}
                    onChange={(e) => setConfigOfflineTimeout(Math.max(2, Math.min(60, Number(e.target.value) || 10)))}
                    className="num-input"
                  />
                  <span>分钟</span>
                </div>
              )}
            </div>

            {/* 2. 游戏闪退 */}
            <div className="config-item border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
              <div>
                <p className="font-bold text-slate-800 dark:text-zinc-200">2. 游戏闪退回手机桌面 (launcher_detect)</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">设备持续处于手机桌面超过 60 秒时告警 (切号中除外)</p>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={configLauncher}
                  onChange={(e) => setConfigLauncher(e.target.checked)}
                />
                <div className="switch-bg" />
              </label>
            </div>

            {/* 3. 锁屏 */}
            <div className="config-item border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
              <div>
                <p className="font-bold text-slate-800 dark:text-zinc-200">3. 物理休眠黑屏锁屏 (device_locked)</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">屏幕被锁定持续超过 30 秒时触发提醒 (影响模拟点击定位)</p>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={configLocked}
                  onChange={(e) => setConfigLocked(e.target.checked)}
                />
                <div className="switch-bg" />
              </label>
            </div>

            {/* 4. VPN */}
            <div className="config-item border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
              <div>
                <p className="font-bold text-slate-800 dark:text-zinc-200">4. 代理 (VPN) 断开直连警告 (vpn_disconnect)</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">VPN 断连暴露真实挂机 IP时即刻发送通知邮件</p>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={configVpn}
                  onChange={(e) => setConfigVpn(e.target.checked)}
                />
                <div className="switch-bg" />
              </label>
            </div>

            {/* 5. 报错 */}
            <div className="config-item border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
              <div>
                <p className="font-bold text-slate-800 dark:text-zinc-200">5. 业务致命报错与卡死 (error_log_report)</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">脚本上报 ERROR 级严重日志时发送，发信频率限 5 分钟/次</p>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={configErrorLog}
                  onChange={(e) => setConfigErrorLog(e.target.checked)}
                />
                <div className="switch-bg" />
              </label>
            </div>

            {/* 6. 内存预警 */}
            <div className="config-item border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
              <div>
                <p className="font-bold text-slate-800 dark:text-zinc-200">6. 脚本内存泄漏超限预警 (out_of_memory)</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">当脚本占用内存超过此限制时发送警报邮件 (10分钟/次)</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-400">上限:</span>
                <input
                  type="number"
                  min={10}
                  max={1024}
                  value={configMemoryLimit}
                  onChange={(e) => setConfigMemoryLimit(Math.max(10, Math.min(1024, Number(e.target.value) || 150)))}
                  className="num-input"
                />
                <span className="text-[10px] text-slate-400">MB</span>
              </div>
            </div>

            {/* 7. 同卡密多设备防账号共享 */}
            <div className="config-item with-input border-t border-slate-100/60 dark:border-zinc-850/40 pt-3">
              <div className="item-main">
                <div>
                  <p className="font-bold text-slate-800 dark:text-zinc-200">7. 同卡密多设备防账号共享 (preventDuplicateAccount)</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">当多台设备同时登录相同账号时，自动触发防御下线并引导换号</p>
                </div>
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={configPreventDuplicate}
                    onChange={(e) => setConfigPreventDuplicate(e.target.checked)}
                  />
                  <div className="switch-bg" />
                </label>
              </div>
              {configPreventDuplicate && (
                <div className="item-sub flex-row gap-4">
                  <span>冲突时执行的动作:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="duplicateAction"
                        value="kick_new"
                        checked={configDuplicateAction === 'kick_new'}
                        onChange={() => setConfigDuplicateAction('kick_new')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>防御踢新 (更安全)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="duplicateAction"
                        value="kick_old"
                        checked={configDuplicateAction === 'kick_old'}
                        onChange={() => setConfigDuplicateAction('kick_old')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>抢占踢老</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 pb-4 bg-slate-50/50 dark:bg-zinc-950/40 flex justify-end border-t border-slate-100/50 dark:border-zinc-850/20">
        <Button
          onClick={handleSaveAlertConfig}
          disabled={configSaving}
          className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4"
        >
          {configSaving ? '保存配置中...' : '保存警报订阅'}
        </Button>
      </CardFooter>
    </Card>
  );
};
