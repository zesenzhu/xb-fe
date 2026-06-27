import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Unlock } from 'lucide-react';
import { BlacklistItem } from '../../_types';
import './index.scss';

interface BlacklistCardProps {
  loading: boolean;
  blacklist: BlacklistItem[];
  onRemoveBlacklist: (deviceId: string, deviceName: string) => void;
}

export const BlacklistCard: React.FC<BlacklistCardProps> = ({
  loading,
  blacklist,
  onRemoveBlacklist,
}) => {
  return (
    <Card className="blacklist-card border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col">
      <CardHeader className="border-b border-slate-100 dark:border-zinc-800/80 pb-4">
        <CardTitle className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-rose-500" />
          已拉黑设备名单 (限制绑定)
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 dark:text-zinc-550 mt-1">
          拉黑后的设备在使用此激活码进行授权验证时将被直接拦截。
        </CardDescription>
      </CardHeader>
      
      <CardContent className="table-container">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">加载黑名单中...</div>
        ) : blacklist.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">暂无拉黑设备</div>
        ) : (
          <table className="blacklist-table">
            <thead>
              <tr>
                <th className="p-3">设备</th>
                <th className="p-3">拉黑时间</th>
                <th className="p-3">拉黑原因</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {blacklist.map((b) => (
                <tr key={b.id}>
                  <td className="p-3">
                    <div className="device-info">
                      <div className="name">{b.deviceName}</div>
                      <div className="id">{b.deviceId}</div>
                    </div>
                  </td>
                  <td className="p-3 text-[11px] text-slate-600 dark:text-zinc-400">
                    {new Date(b.blockedAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="p-3 reason-cell" title={b.reason || undefined}>
                    {b.reason}
                  </td>
                  <td className="p-3">
                    <Button
                      onClick={() => onRemoveBlacklist(b.deviceId, b.deviceName || '未知设备')}
                      className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold h-7 px-2.5 rounded-lg border border-emerald-250 dark:border-emerald-900/40 flex items-center gap-1 transition-all active:scale-97 cursor-pointer"
                    >
                      <Unlock className="w-3 h-3" />
                      解除拉黑
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};
