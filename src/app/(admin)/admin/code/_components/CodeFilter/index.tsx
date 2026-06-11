'use client';

import React from 'react';
import { Input, Button, Select, DatePicker, Modal, message } from 'antd';
import { Upload, Plus, ShieldAlert } from 'lucide-react';
import { PermissionGuard } from '@/components/business/PermissionGuard';
import { api } from '@/lib/axios';
import './style.scss';

export interface CodeFilterProps {
  filters: any;
  onFilterChange: (key: string, value: any) => void;
  onReset: () => void;
  onSearch: () => void;
  selectedRowKeys: React.Key[];
  onClearSelection: () => void;
  onSuccess: () => void;
  onBatchAdjustClick: () => void;
  onOpenImport: () => void;
  onOpenGenerate: () => void;
}

export default function CodeFilter({
  filters,
  onFilterChange,
  onReset,
  onSearch,
  selectedRowKeys,
  onClearSelection,
  onSuccess,
  onBatchAdjustClick,
  onOpenImport,
  onOpenGenerate,
}: CodeFilterProps) {

  // 批量修改启用状态
  const handleBatchStatusChange = async (status: 'active' | 'disabled') => {
    try {
      await api.patch('/register-codes/batch-status', {
        ids: selectedRowKeys,
        status,
      });
      message.success(`成功更新了已选激活码的状态！`);
      onClearSelection();
      onSuccess();
    } catch (err: any) {
      message.error(err.message || '批量更新状态失败');
    }
  };

  // 批量作废注销
  const handleBatchDelete = () => {
    Modal.confirm({
      title: '批量作废并销毁激活码',
      icon: <ShieldAlert className="text-red-500 w-6 h-6 inline-block mr-2" />,
      content: (
        <div className="mt-2 text-slate-600 dark:text-zinc-400">
          您正在批量物理注销这 <strong className="text-red-600 dark:text-red-400">{selectedRowKeys.length}</strong> 个激活码。
          注销后，这些激活码绑定的任何端侧设备将**立刻被强制踢下线**。该操作不可撤销！
        </div>
      ),
      okText: '确认销毁',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.post('/register-codes/batch-delete', {
            ids: selectedRowKeys,
          });
          message.success(`已成功作废并销毁 ${selectedRowKeys.length} 个注册码！`);
          onClearSelection();
          onSuccess();
        } catch (err: any) {
          message.error(err.message || '批量注销失败');
        }
      },
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-2.5 px-4 shadow-sm animate-in fade-in duration-200 code-filter-container">
      <div className="flex flex-wrap gap-2.5 items-center">
        {/* 输入框强制固定宽度：授权码(180px)、设备ID(160px) */}
        <Input
          placeholder="授权码 (卡密)"
          value={filters.code || ''}
          onChange={(e) => onFilterChange('code', e.target.value)}
          className="h-9 border-slate-200 dark:border-zinc-800 rounded-lg w-[180px] filter-input-code"
          allowClear
        />

        <Input
          placeholder="绑定设备ID"
          value={filters.deviceId || ''}
          onChange={(e) => onFilterChange('deviceId', e.target.value)}
          className="h-9 border-slate-200 dark:border-zinc-800 rounded-lg w-[160px] filter-input-device"
          allowClear
        />

        <Select
          className="h-9 rounded-lg w-[140px]"
          placeholder="所属应用 (全部)"
          value={filters.appName || undefined}
          onChange={(val) => onFilterChange('appName', val)}
          allowClear
          options={[
            { value: 'general', label: '通用型卡密' },
            { value: '老系统导入', label: '老系统卡密' },
          ]}
          dropdownStyle={{ borderRadius: '8px' }}
        />

        <Select
          className="h-9 rounded-lg w-[110px]"
          placeholder="卡种 (全部)"
          value={filters.cardType || undefined}
          onChange={(val) => onFilterChange('cardType', val)}
          allowClear
          options={[
            { value: 'SK', label: '时卡' },
            { value: 'TK', label: '天卡' },
            { value: 'WK', label: '周卡' },
            { value: 'YK', label: '月卡' },
            { value: 'NK', label: '年卡' },
            { value: 'YJ', label: '永久卡' },
          ]}
        />

        <Select
          className="h-9 rounded-lg w-[110px]"
          placeholder="状态 (全部)"
          value={filters.status || undefined}
          onChange={(val) => onFilterChange('status', val)}
          allowClear
          options={[
            { value: 'unused', label: '未激活' },
            { value: 'active', label: '使用中' },
            { value: 'full', label: '已满载' },
            { value: 'expired', label: '已过期' },
            { value: 'disabled', label: '已禁用' },
          ]}
        />

        <Select
          className="h-9 rounded-lg w-[120px]"
          placeholder="来源 (全部)"
          value={filters.source || undefined}
          onChange={(val) => onFilterChange('source', val)}
          allowClear
          options={[
            { value: 'CREATE', label: '自建激活码' },
            { value: 'IMPORT', label: '导入激活码' },
          ]}
        />

        <Select
          className="h-9 rounded-lg w-[110px]"
          placeholder="服务 (全部)"
          value={filters.isEnabled || undefined}
          onChange={(val) => onFilterChange('isEnabled', val)}
          allowClear
          options={[
            { value: 'true', label: '启用中' },
            { value: 'false', label: '已禁用' },
          ]}
        />

        <DatePicker.RangePicker
          className="h-9 border-slate-200 dark:border-zinc-800 rounded-lg w-[220px]"
          value={filters.expireRange || null}
          onChange={(val) => onFilterChange('expireRange', val)}
          placeholder={['到期开始', '到期结束']}
        />

        {/* 检索操作按钮跟条件排在一起 */}
        <div className="flex flex-wrap items-center gap-2 ml-auto pb-px">
          {selectedRowKeys.length > 0 && (
            <div className="flex items-center gap-1.5 mr-2 animate-in fade-in slide-in-from-right-1 duration-200">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/30">
                已选 <strong className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300">{selectedRowKeys.length}</strong> 项
              </span>
              <Button 
                type="link" 
                size="small" 
                onClick={onClearSelection} 
                className="p-0 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 font-bold hover:underline text-xs h-auto"
              >
                取消
              </Button>
              <div className="w-px h-4 bg-slate-200 dark:bg-zinc-850 mx-1" />
            </div>
          )}

          {/* 导入老卡 (仅在有相应权限且未选择行时显示，或作为基础操作常驻) */}
          <PermissionGuard permission="code:create">
            <Button
              className="border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 font-bold text-xs flex items-center gap-1.5 h-9"
              onClick={onOpenImport}
            >
              <Upload className="w-4 h-4" />
              导入老卡
            </Button>
          </PermissionGuard>

          {/* 批量制卡 */}
          <PermissionGuard permission="code:create">
            <Button
              type="primary"
              className="font-bold text-xs flex items-center gap-1 h-9"
              onClick={onOpenGenerate}
            >
              <Plus className="w-4 h-4" />
              批量制卡
            </Button>
          </PermissionGuard>

          {/* 批量启用 */}
          <Button 
            disabled={selectedRowKeys.length === 0}
            onClick={() => handleBatchStatusChange('active')} 
            className={`text-xs font-bold h-9 px-3 rounded-lg transition-all ${
              selectedRowKeys.length > 0 
                ? 'border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer' 
                : 'border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-600 bg-slate-50/50 dark:bg-zinc-950/10'
            }`}
          >
            批量启用
          </Button>

          {/* 批量禁用 */}
          <Button 
            disabled={selectedRowKeys.length === 0}
            onClick={() => handleBatchStatusChange('disabled')} 
            className={`text-xs font-bold h-9 px-3 rounded-lg transition-all ${
              selectedRowKeys.length > 0 
                ? 'border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer' 
                : 'border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-600 bg-slate-50/50 dark:bg-zinc-950/10'
            }`}
          >
            批量禁用
          </Button>

          {/* 批量微调 */}
          <Button 
            disabled={selectedRowKeys.length === 0}
            onClick={onBatchAdjustClick} 
            className={`text-xs font-bold h-9 px-3 rounded-lg transition-all ${
              selectedRowKeys.length > 0 
                ? 'border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer' 
                : 'border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-600 bg-slate-50/50 dark:bg-zinc-950/10'
            }`}
          >
            批量微调
          </Button>

          {/* 批量注销 */}
          <PermissionGuard permission="code:delete">
            <Button 
              danger 
              type={selectedRowKeys.length > 0 ? "primary" : "default"}
              disabled={selectedRowKeys.length === 0}
              onClick={handleBatchDelete} 
              className="text-xs font-bold h-9 px-3 rounded-lg"
            >
              批量注销
            </Button>
          </PermissionGuard>

          <div className="w-px h-4 bg-slate-200 dark:bg-zinc-850 mx-1" />

          {/* 查询与重置 */}
          <Button 
            onClick={onReset} 
            className="text-xs h-9 border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-lg px-3 font-semibold cursor-pointer"
          >
            清空筛选
          </Button>
          <Button 
            type="primary"
            onClick={onSearch} 
            className="text-xs h-9 rounded-lg font-bold px-3 cursor-pointer"
          >
            查询刷新
          </Button>
        </div>
      </div>
    </div>
  );
}
