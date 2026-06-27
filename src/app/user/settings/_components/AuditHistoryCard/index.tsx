import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListTodo, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuditHistory, BlacklistItem } from '../../_types';
import './index.scss';

interface AuditHistoryCardProps {
  loading: boolean;
  historyList: AuditHistory[];
  blacklist: BlacklistItem[];
  onAddBlacklist: (deviceId: string, deviceName: string) => void;
}

export const AuditHistoryCard: React.FC<AuditHistoryCardProps> = ({
  loading,
  historyList,
  blacklist,
  onAddBlacklist,
}) => {
  return (
    <Card className="history-card border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col">
      <CardHeader className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
        <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-indigo-500" />
          物理设备解绑审计历史
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
          记录此激活码下的物理绑定设备解绑事件。
        </CardDescription>
      </CardHeader>
      
      <CardContent className="table-container">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">加载历史记录中...</div>
        ) : historyList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">暂无任何解绑记录</div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th className="p-3">设备</th>
                <th className="p-3">绑定/解绑时间</th>
                <th className="p-3">解绑原因</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((h) => {
                const isBlocked = blacklist.some((b) => b.deviceId === h.deviceId);
                return (
                  <tr key={h.id}>
                    <td className="p-3">
                      <div className="device-info">
                        <div className="name">{h.deviceName}</div>
                        <div className="id">{h.deviceId}</div>
                        <div className="ip">IP: {h.lastIp}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="time-info">
                        <div>绑定: {new Date(h.boundAt).toLocaleString('zh-CN')}</div>
                        <div>解绑: {new Date(h.unbindAt).toLocaleString('zh-CN')}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        "reason-badge",
                        h.unbindReason === 'admin' ? "admin" : "user"
                      )}>
                        {h.unbindReason === 'admin' ? '管理员强制' : '用户解绑'}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button
                        onClick={() => onAddBlacklist(h.deviceId, h.deviceName || '未知设备')}
                        disabled={isBlocked}
                        className={cn(
                          "text-[10px] font-bold h-7 px-2.5 rounded-lg border flex items-center gap-1 transition-all active:scale-97 cursor-pointer",
                          isBlocked 
                            ? "bg-slate-50 text-slate-400 dark:bg-zinc-950 dark:text-zinc-650 border-slate-200 dark:border-zinc-900 cursor-not-allowed"
                            : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/40"
                        )}
                      >
                        <Lock className="w-3 h-3" />
                        {isBlocked ? '已拉黑' : '拉黑设备'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};
