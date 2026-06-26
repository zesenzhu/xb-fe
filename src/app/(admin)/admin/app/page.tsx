'use client';

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ShieldCheck,
  ListPlus,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// 移除对 table/textarea 的 UI 库组件导入，改为使用原生 HTML 并配合 Tailwind CSS
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/lib/axios';

interface AppFeature {
  id: string;
  appId: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

interface AppItem {
  id: string;
  name: string;
  appKey: string;
  description?: string;
  dashboardPath?: string;
  status: number;
  features: AppFeature[];
  createdAt: string;
}

export default function AdminAppConfigPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);

  // App Modal 状态
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [appName, setAppName] = useState('');
  const [appKey, setAppKey] = useState('');
  const [appDesc, setAppDesc] = useState('');
  const [appStatus, setAppStatus] = useState(1);
  const [appSaving, setAppSaving] = useState(false);
  const [appDashboardPath, setAppDashboardPath] = useState('');

  // Features Drawer/Dialog 状态
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  
  // Feature Edit Modal 状态
  const [featureEditOpen, setFeatureEditOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<AppFeature | null>(null);
  const [featName, setFeatName] = useState('');
  const [featCode, setFeatCode] = useState('');
  const [featDesc, setFeatDesc] = useState('');
  const [featSaving, setFeatSaving] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/apps');
      setApps(data || []);
    } catch (error: any) {
      toast.error(error.message || '获取应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // App 保存 (新增或修改)
  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim() || !appKey.trim()) {
      toast.error('应用名称和应用标识(AppKey) 不能为空');
      return;
    }

    setAppSaving(true);
    try {
      if (editingApp) {
        // 更新
        await api.put(`/apps/${editingApp.id}`, {
          name: appName,
          appKey,
          description: appDesc,
          status: appStatus,
          dashboardPath: appDashboardPath || null,
        });
        toast.success('更新应用成功');
      } else {
        // 创建
        await api.post('/apps', {
          name: appName,
          appKey,
          description: appDesc,
          status: appStatus,
          dashboardPath: appDashboardPath || null,
        });
        toast.success('创建应用成功');
      }
      setAppModalOpen(false);
      fetchApps();
    } catch (error: any) {
      toast.error(error.message || '保存应用失败');
    } finally {
      setAppSaving(false);
    }
  };

  const openAppModal = (app: AppItem | null = null) => {
    if (app) {
      setEditingApp(app);
      setAppName(app.name);
      setAppKey(app.appKey);
      setAppDesc(app.description || '');
      setAppStatus(app.status);
      setAppDashboardPath(app.dashboardPath || '');
    } else {
      setEditingApp(null);
      setAppName('');
      setAppKey('');
      setAppDesc('');
      setAppStatus(1);
      setAppDashboardPath('');
    }
    setAppModalOpen(true);
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm('您确定要作废并删除此应用吗？删除应用会同步删除其下所有配置的功能权限点！')) {
      return;
    }
    try {
      await api.delete(`/apps/${id}`);
      toast.success('删除应用成功');
      fetchApps();
    } catch (error: any) {
      toast.error(error.message || '删除应用失败');
    }
  };

  // ------------------------------------------
  // Feature 交互逻辑
  // ------------------------------------------
  const openFeaturesManager = (app: AppItem) => {
    setSelectedApp(app);
    setFeatureModalOpen(true);
  };

  const openFeatureEditModal = (feat: AppFeature | null = null) => {
    if (feat) {
      setEditingFeature(feat);
      setFeatName(feat.name);
      setFeatCode(feat.code);
      setFeatDesc(feat.description || '');
    } else {
      setEditingFeature(null);
      setFeatName('');
      setFeatCode('');
      setFeatDesc('');
    }
    setFeatureEditOpen(true);
  };

  const handleSaveFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (!featName.trim() || !featCode.trim()) {
      toast.error('功能名称和功能标识(Code) 不能为空');
      return;
    }

    setFeatSaving(true);
    try {
      if (editingFeature) {
        // 更新 Feature
        await api.put(`/apps/features/${editingFeature.id}`, {
          name: featName,
          code: featCode,
          description: featDesc,
        });
        toast.success('更新功能权限点成功');
      } else {
        // 新增 Feature
        await api.post(`/apps/${selectedApp.id}/features`, {
          name: featName,
          code: featCode,
          description: featDesc,
        });
        toast.success('添加功能权限点成功');
      }
      setFeatureEditOpen(false);
      // 重新拉取整个 App 刷新页面数据
      const updatedApp: any = await api.get(`/apps/${selectedApp.id}`);
      setSelectedApp(updatedApp);
      fetchApps();
    } catch (error: any) {
      toast.error(error.message || '保存功能点失败');
    } finally {
      setFeatSaving(false);
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!selectedApp) return;
    if (!confirm('确定要删除这个功能权限点吗？')) return;

    try {
      await api.delete(`/apps/features/${featureId}`);
      toast.success('功能权限点删除成功');
      
      const updatedApp: any = await api.get(`/apps/${selectedApp.id}`);
      setSelectedApp(updatedApp);
      fetchApps();
    } catch (error: any) {
      toast.error(error.message || '删除功能点失败');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 头部装饰 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-wider flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-indigo-500 shrink-0" />
            应用与脚本配置管理
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">
            管理不同游戏的独立脚本包及专属控制大屏，并为卡密进行精细化的功能权限定义。
          </p>
        </div>
        <Button
          onClick={() => openAppModal()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold gap-2 rounded-xl transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="w-4.5 h-4.5" />
          创建新应用
        </Button>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : apps.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Info className="w-12 h-12 text-zinc-400 mb-4" />
            <h3 className="font-extrabold text-sm text-zinc-700 dark:text-zinc-300">暂无应用配置</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              创建游戏应用后，可为应用增加各挂机功能点，并在此后的“激活码生成”中为卡密限制或赋予该应用的细分权限。
            </p>
            <Button onClick={() => openAppModal()} className="mt-4 bg-indigo-600 font-extrabold rounded-xl text-xs">
              立即创建第一个应用
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {apps.map((app) => (
            <Card
              key={app.id}
              className="border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md shadow-lg overflow-hidden flex flex-col hover:border-indigo-500/30 transition-all duration-300 group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-800 dark:text-zinc-100">{app.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                        {app.appKey}
                      </span>
                    </div>
                    <CardDescription className="text-xs truncate max-w-[280px]">
                      {app.description || '无应用描述'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => openAppModal(app)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800">
                      <Edit2 className="w-3.5 h-3.5 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteApp(app.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col pt-0">
                <div className="border-t border-slate-100 dark:border-zinc-800/60 my-2" />
                
                {/* 功能权限点快览 */}
                <div className="flex-1 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">功能权限点 ({app.features.length})</span>
                    <Button
                      variant="link"
                      onClick={() => openFeaturesManager(app)}
                      className="text-xs text-indigo-500 hover:text-indigo-400 p-0 font-extrabold h-auto"
                    >
                      管理功能点
                    </Button>
                  </div>
                  {app.features.length === 0 ? (
                    <div className="text-[11px] text-zinc-500 italic py-2">
                      暂未定义任何细分功能点。点击右上角“管理功能点”添加。
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                      {app.features.map((feat) => (
                        <div
                          key={feat.id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[10px] text-slate-600 dark:text-zinc-300 font-bold border border-slate-200/50 dark:border-zinc-800"
                          title={`${feat.name} (${feat.code}) - ${feat.description || '无描述'}`}
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{feat.name}</span>
                          <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">({feat.code})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 text-[10px] font-mono text-zinc-500 bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-800/40 flex justify-between items-center select-none">
                  <span>大屏路由: <span className="text-zinc-300 font-extrabold">{app.dashboardPath || `/user/apps/${app.appKey}`}</span></span>
                  <span>状态: {app.status === 1 ? '🟢 启用' : '🔴 禁用'}</span>
                </div>
                
                <div className="mt-2.5 flex justify-end text-[9px] font-mono text-zinc-550 select-none">
                  <span>创建于: {new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ==========================================
          App 新增/编辑 弹窗
          ========================================== */}
      <Dialog open={appModalOpen} onOpenChange={setAppModalOpen}>
        <DialogContent className="max-w-md dark:bg-zinc-900 dark:border-zinc-800">
          <form onSubmit={handleSaveApp}>
            <DialogHeader>
              <DialogTitle className="text-sm font-black flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                {editingApp ? '编辑游戏应用项目' : '创建新游戏应用项目'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                应用代表独立的挂机脚本包，对应的 AppKey 作为客户端连接与前台分发时的匹配依据。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="appName" className="text-xs font-bold text-slate-500 dark:text-zinc-400">应用/游戏名称</Label>
                <Input
                  id="appName"
                  placeholder="例如：天龙八部手游辅助"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appKey" className="text-xs font-bold text-slate-500 dark:text-zinc-400">应用唯一标识 (AppKey)</Label>
                <Input
                  id="appKey"
                  placeholder="例如：game_tlbb (唯一硬匹配字符)"
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  disabled={!!editingApp} // AppKey 不允许后期修改，防止关联逻辑崩塌
                  className="bg-slate-50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white focus-visible:ring-indigo-500 font-mono disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appDashboardPath" className="text-xs font-bold text-slate-500 dark:text-zinc-400">跳转界面/路由 (DashboardPath)</Label>
                <select
                  id="appDashboardPath"
                  value={appDashboardPath}
                  onChange={(e) => setAppDashboardPath(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 text-slate-800 dark:text-white font-medium cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-300">默认系统动态匹配 ( /user/apps/[AppKey] )</option>
                  <option value="/user/apps/frxxzrjp" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-300">凡人修仙传:人界篇 物理专属大屏 ( /user/apps/frxxzrjp )</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appDesc" className="text-xs font-bold text-slate-500 dark:text-zinc-400">应用描述</Label>
                <textarea
                  id="appDesc"
                  placeholder="简单记录此应用所服务的游戏包与控制台预期作用..."
                  value={appDesc}
                  onChange={(e) => setAppDesc(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/40 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 dark:text-zinc-400">启用状态</Label>
                <div className="flex items-center gap-6 mt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      name="appStatus"
                      value={1}
                      checked={appStatus === 1}
                      onChange={() => setAppStatus(1)}
                      className="accent-indigo-600"
                    />
                    <span>正常启用</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-zinc-300">
                    <input
                      type="radio"
                      name="appStatus"
                      value={0}
                      checked={appStatus === 0}
                      onChange={() => setAppStatus(0)}
                      className="accent-indigo-600"
                    />
                    <span>禁用</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAppModalOpen(false)}
                className="font-bold text-xs"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={appSaving}
                className="bg-indigo-600 hover:bg-indigo-500 font-extrabold text-xs"
              >
                {appSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存应用'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          功能权限点管理抽屉/弹窗 (Features Manager)
          ========================================== */}
      <Dialog open={featureModalOpen} onOpenChange={setFeatureModalOpen}>
        <DialogContent className="max-w-3xl dark:bg-zinc-900 dark:border-zinc-800 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-indigo-500" />
              管理 [{selectedApp?.name}] 的功能权限点
            </DialogTitle>
            <DialogDescription className="text-xs">
              在此定义当前游戏脚本在运行中包含的各细分功能，例如“野外挂机”、“自动钓鱼”等，用于在激活码层分配权限。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => openFeatureEditModal()}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg h-8 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                添加功能权限点
              </Button>
            </div>

            <div className="border border-slate-200 dark:border-zinc-850 rounded-xl overflow-hidden">
              <table className="w-full caption-bottom text-sm">
                <thead className="bg-slate-50 dark:bg-zinc-950/40 [&_tr]:border-b">
                  <tr className="border-b border-slate-200 dark:border-zinc-800">
                    <th className="h-12 px-4 text-left align-middle text-xs font-black text-muted-foreground w-[140px]">功能名</th>
                    <th className="h-12 px-4 text-left align-middle text-xs font-black text-muted-foreground w-[120px]">标识 Code</th>
                    <th className="h-12 px-4 text-left align-middle text-xs font-black text-muted-foreground">描述</th>
                    <th className="h-12 px-4 align-middle text-xs font-black text-muted-foreground w-[100px] text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {!selectedApp?.features || selectedApp.features.length === 0 ? (
                    <tr className="transition-colors hover:bg-muted/50">
                      <td colSpan={4} className="p-4 align-middle text-center text-xs text-zinc-500 py-6 italic">
                        目前无任何功能点配置，点击右上角添加。
                      </td>
                    </tr>
                  ) : (
                    selectedApp.features.map((feat) => (
                      <tr key={feat.id} className="border-b border-slate-100 dark:border-zinc-800/40 text-xs transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          {feat.name}
                        </td>
                        <td className="p-4 align-middle font-mono text-indigo-500 font-bold">{feat.code}</td>
                        <td className="p-4 align-middle text-muted-foreground truncate max-w-[320px]" title={feat.description}>
                          {feat.description || '-'}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => openFeatureEditModal(feat)}
                              className="w-7 h-7 hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                              <Edit2 className="w-3 h-3 text-slate-550" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFeature(feat.id)}
                              className="w-7 h-7 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-150 dark:border-zinc-800/80 pt-3 flex justify-end">
            <Button onClick={() => setFeatureModalOpen(false)} className="text-xs font-bold rounded-lg px-6">
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          Feature 具体的 新增/编辑 子弹窗
          ========================================== */}
      <Dialog open={featureEditOpen} onOpenChange={setFeatureEditOpen}>
        <DialogContent className="max-w-sm dark:bg-zinc-900 dark:border-zinc-850 z-[100]">
          <form onSubmit={handleSaveFeature}>
            <DialogHeader>
              <DialogTitle className="text-xs font-black">
                {editingFeature ? `编辑功能点` : `添加功能权限点`}
              </DialogTitle>
              <DialogDescription className="text-[10px]">
                输入功能名与系统匹配标识。标识应保持在当前应用内唯一。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="featName" className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">功能名称</Label>
                <Input
                  id="featName"
                  placeholder="例如：自动挖矿"
                  value={featName}
                  onChange={(e) => setFeatName(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-white focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="featCode" className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">功能安全标识 (Code)</Label>
                <Input
                  id="featCode"
                  placeholder="例如：auto_mining"
                  value={featCode}
                  onChange={(e) => setFeatCode(e.target.value)}
                  disabled={!!editingFeature} // 标识 Code 不允许修改
                  className="bg-slate-50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 text-xs text-slate-800 dark:text-white focus-visible:ring-indigo-500 font-mono disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="featDesc" className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">功能描述</Label>
                <textarea
                  id="featDesc"
                  placeholder="简单说明这个功能限制或赋予客户端的行为..."
                  value={featDesc}
                  onChange={(e) => setFeatDesc(e.target.value)}
                  className="flex min-h-[60px] w-full rounded-md border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/40 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFeatureEditOpen(false)}
                className="font-bold text-xs"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={featSaving}
                className="bg-indigo-600 hover:bg-indigo-500 font-extrabold text-xs"
              >
                {featSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : '确认保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
