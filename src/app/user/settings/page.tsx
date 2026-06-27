'use client';

import React, { useState } from 'react';
import { Cpu, ListTodo, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/store/useUserStore';
import { useUserSettings } from './_hooks/useUserSettings';
import { AlertConfigCard } from './_components/AlertConfigCard';
import { AuditHistoryCard } from './_components/AuditHistoryCard';
import { BlacklistCard } from './_components/BlacklistCard';

export default function UserSettingsPage() {
  const { user } = useUserStore();
  const code = user?.username; // 当前登录激活码

  const [activeTab, setActiveTab] = useState<'alertConfig' | 'historyBlacklist'>('alertConfig');

  // 获取自定义 Hook 管理的状态与交互方法
  const settings = useUserSettings(code, activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 标头及导航 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-150 dark:border-zinc-800/50">
        <h1 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          我的设置
        </h1>

        {/* 现代导航 Tabs */}
        <div className="flex space-x-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl w-fit self-start">
          <button
            onClick={() => setActiveTab('alertConfig')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'alertConfig'
                ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm border border-slate-200/50 dark:border-zinc-800/50"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-850 dark:hover:text-zinc-200"
            )}
          >
            <Bell className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            警报与通知中心
          </button>
          <button
            onClick={() => setActiveTab('historyBlacklist')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'historyBlacklist'
                ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm border border-slate-200/50 dark:border-zinc-800/50"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-850 dark:hover:text-zinc-200"
            )}
          >
            <ListTodo className="w-3.5 h-3.5 text-rose-500" />
            历史记录与黑名单
          </button>
        </div>
      </div>

      {/* Tab 2: 警报与通知中心 */}
      {activeTab === 'alertConfig' && (
        <AlertConfigCard
          code={code}
          configEmail={settings.configEmail}
          setConfigEmail={settings.setConfigEmail}
          configOffline={settings.configOffline}
          setConfigOffline={settings.setConfigOffline}
          configOfflineTimeout={settings.configOfflineTimeout}
          setConfigOfflineTimeout={settings.setConfigOfflineTimeout}
          configLauncher={settings.configLauncher}
          setConfigLauncher={settings.setConfigLauncher}
          configLocked={settings.configLocked}
          setConfigLocked={settings.setConfigLocked}
          configVpn={settings.configVpn}
          setConfigVpn={settings.setConfigVpn}
          configErrorLog={settings.configErrorLog}
          setConfigErrorLog={settings.setConfigErrorLog}
          configMemoryLimit={settings.configMemoryLimit}
          setConfigMemoryLimit={settings.setConfigMemoryLimit}
          configSaving={settings.configSaving}
          configPreventDuplicate={settings.configPreventDuplicate}
          setConfigPreventDuplicate={settings.setConfigPreventDuplicate}
          configDuplicateAction={settings.configDuplicateAction}
          setConfigDuplicateAction={settings.setConfigDuplicateAction}
          isPushSupported={settings.isPushSupported}
          isSubscribed={settings.isSubscribed}
          showGuide={settings.showGuide}
          isPushLoading={settings.isPushLoading}
          handleTogglePush={settings.handleTogglePush}
          handleSaveAlertConfig={settings.handleSaveAlertConfig}
        />
      )}

      {/* Tab 3: 历史记录与黑名单 */}
      {activeTab === 'historyBlacklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <AuditHistoryCard
            loading={settings.historyLoading}
            historyList={settings.historyList}
            blacklist={settings.blacklist}
            onAddBlacklist={settings.handleAddBlacklist}
          />
          <BlacklistCard
            loading={settings.historyLoading}
            blacklist={settings.blacklist}
            onRemoveBlacklist={settings.handleRemoveBlacklist}
          />
        </div>
      )}
    </div>
  );
}
