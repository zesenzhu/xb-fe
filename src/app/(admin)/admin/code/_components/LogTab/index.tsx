'use client';

import React from 'react';
import { Table, Button, Input, Select, Tag, Tooltip, message } from 'antd';
import { useTableQuery } from '@/hooks/useTableQuery';
import { api } from '@/lib/axios';
import { formatDateTime } from '@/lib/utils';
import './style.scss';

export default function LogTab() {
  // 获取日志列表
  const fetchActionLogs = async (params: { page: number; limit: number; code?: string; actionType?: string }) => {
    try {
      const response: any = await api.get('/register-codes/action-logs', {
        params: {
          page: params.page,
          limit: params.limit,
          code: params.code || undefined,
          actionType: params.actionType || undefined,
        },
      });
      return {
        list: response.list || [],
        total: response.total || 0,
      };
    } catch (err: any) {
      message.error(err.message || '获取操作日志失败');
      return { list: [], total: 0 };
    }
  };

  const { 
    tableProps: logTableProps, 
    filters: logFilters, 
    setFilters: setLogFilters, 
    refetch: refetchLogs 
  } = useTableQuery<any>({
    queryKey: ['action-logs'],
    fetchFn: fetchActionLogs,
  });

  const logColumns = [
    {
      title: '授权码 (卡密)',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => (
        <Tooltip title="点击复制卡密">
          <span 
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                message.success('卡密已成功复制！');
              } catch {
                message.error('复制失败，请手动选择复制');
              }
            }}
            className="font-mono font-bold text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded select-all border border-slate-200 dark:border-zinc-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-[0.97] inline-block"
          >
            {text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'actionType',
      key: 'actionType',
      render: (type: string) => {
        switch (type) {
          case 'GENERATE': return <Tag color="blue">批量制卡</Tag>;
          case 'ADJUST': return <Tag color="orange">时长微调</Tag>;
          case 'ENABLE': return <Tag color="green">启用卡密</Tag>;
          case 'DISABLE': return <Tag color="red">禁用卡密</Tag>;
          case 'UNBIND': return <Tag color="purple">设备解绑</Tag>;
          case 'DELETE': return <Tag color="magenta">作废销毁</Tag>;
          default: return <Tag color="default">{type}</Tag>;
        }
      }
    },
    {
      title: '变更描述详情',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{text}</span>
      ),
    },
    {
      title: '操作管理员',
      dataIndex: 'operator',
      key: 'operator',
      render: (text: string) => (
        <Tag color="geekblue">{text}</Tag>
      ),
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => (
        <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
          {formatDateTime(text)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 mt-2 animate-in fade-in duration-200 log-tab-container">
      {/* 说明 */}
      <div className="text-xs text-slate-500 dark:text-zinc-400">
        查询授权激活码在后台的操作变更日志，包括生成、微调、启用禁用、解绑与销毁
      </div>

      {/* 日志检索面板 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-x-5 gap-y-3.5 items-end">
          {/* 1. 授权码 */}
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">授权码 (卡密)</span>
            <Input
              placeholder="搜索卡密..."
              value={logFilters.code || ''}
              onChange={(e) => setLogFilters({ ...logFilters, code: e.target.value })}
              className="h-9 border-slate-200 dark:border-zinc-800 rounded-lg w-full"
              allowClear
            />
          </div>

          {/* 2. 操作类型 */}
          <div className="flex flex-col gap-1 w-full sm:w-40">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">操作类型</span>
            <Select
              className="h-9 rounded-lg w-full"
              placeholder="全部操作"
              value={logFilters.actionType || undefined}
              onChange={(val) => setLogFilters({ ...logFilters, actionType: val })}
              allowClear
              options={[
                { value: 'GENERATE', label: '批量制卡' },
                { value: 'ADJUST', label: '时长微调' },
                { value: 'ENABLE', label: '启用卡密' },
                { value: 'DISABLE', label: '禁用卡密' },
                { value: 'UNBIND', label: '设备解绑' },
                { value: 'DELETE', label: '作废销毁' },
              ]}
              dropdownStyle={{ borderRadius: '8px' }}
            />
          </div>

          <div className="flex gap-2 ml-auto pb-px">
            <Button 
              onClick={() => setLogFilters({})} 
              className="text-xs h-9 border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-lg"
            >
              清空筛选
            </Button>
            <Button 
              type="primary"
              onClick={() => refetchLogs()} 
              className="text-xs h-9 rounded-lg font-bold"
            >
              查询刷新
            </Button>
          </div>
        </div>
      </div>

      {/* 日志表格 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <Table 
          {...logTableProps} 
          columns={logColumns} 
          rowKey="id" 
          scroll={{ y: 'calc(100vh - 440px)' }}
          pagination={{
            ...logTableProps.pagination,
            style: { marginRight: 16, marginBottom: 16 }
          }}
        />
      </div>
    </div>
  );
}
