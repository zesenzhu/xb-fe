'use client';

import React from 'react';
import { Table, Button, Space, Tag, Modal, Switch, message, Tooltip, Badge, Popover, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Cpu, Clock, RefreshCw, ShieldAlert, Settings, MoreHorizontal } from 'lucide-react';
import { PermissionGuard } from '@/components/business/PermissionGuard';
import { api } from '@/lib/axios';
import { formatDateTime, copyToClipboard } from '@/lib/utils';
import { LicenseCode } from '../types';
import './style.scss';

export interface CodeTableProps {
  tableProps: any;
  selectedRowKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
  onAdjustClick: (record: LicenseCode) => void;
  onConfigClick: (record: LicenseCode) => void;
  onSuccess: () => void;
  onDeviceClick?: (deviceId: string, code: string) => void;
}

export default function CodeTable({
  tableProps,
  selectedRowKeys,
  onSelectionChange,
  onAdjustClick,
  onConfigClick,
  onSuccess,
  onDeviceClick,
}: CodeTableProps) {

  // 状态开关
  const handleStatusChange = async (record: LicenseCode, checked: boolean) => {
    try {
      const targetStatus = checked ? 'active' : 'disabled';
      await api.patch(`/register-codes/${record.id}/status`, { status: targetStatus });
      message.success(`注册码已${checked ? '启用' : '禁用'}`);
      onSuccess();
    } catch (err: any) {
      message.error(err.message || '更改状态失败');
    }
  };

  // 设备强制解绑
  const handleUnbind = (record: LicenseCode) => {
    Modal.confirm({
      title: '强制解绑设备',
      icon: <RefreshCw className="text-amber-500 w-6 h-6 inline-block mr-2" />,
      content: (
        <div className="mt-2 text-slate-600 dark:text-zinc-400">
          确定解绑注册码 <Tag className="font-mono font-bold">{record.code}</Tag> 绑定的设备吗？
          解绑后，在线脚本长连接将被**强制切断（Kick）**，腾出绑定额度供新设备使用。
        </div>
      ),
      okText: '确定解绑',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.patch(`/register-codes/${record.id}/unbind`);
          message.success(`设备已成功解绑并被强制下线！`);
          onSuccess();
        } catch (err: any) {
          message.error(err.message || '解绑失败');
        }
      },
    });
  };

  // 作废注销
  const handleRevoke = (id: string, code: string) => {
    Modal.confirm({
      title: '作废并销毁激活码',
      icon: <ShieldAlert className="text-red-500 w-6 h-6 inline-block mr-2" />,
      content: (
        <div className="mt-2 text-slate-600 dark:text-zinc-400">
          您正在物理注销激活码 <Tag className="font-mono font-bold">{code}</Tag>。
          注销后，任何已绑定的端侧设备将**立刻掉线**且无法再登录，历史数据将同步清理。该操作不可撤销！
        </div>
      ),
      okText: '确认销毁',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/register-codes/${id}`);
          message.success(`已停用并销毁注册码: ${code}`);
          onSuccess();
        } catch (err: any) {
          message.error(err.message || '注销失败');
        }
      },
    });
  };

  const getCardTypeLabel = (type: string) => {
    switch (type) {
      case 'SK': return <Tag color="blue">时卡</Tag>;
      case 'TK': return <Tag color="green">天卡</Tag>;
      case 'WK': return <Tag color="cyan">周卡</Tag>;
      case 'YK': return <Tag color="geekblue">月卡</Tag>;
      case 'NK': return <Tag color="purple">年卡</Tag>;
      case 'YJ': return <Tag color="gold">永久卡</Tag>;
      default: return <Tag color="default">{type}</Tag>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unused': return <Badge status="default" text="未激活" />;
      case 'active': return <Badge status="success" text="使用中" />;
      case 'expired': return <Badge status="error" text="已过期" />;
      case 'full': return <Badge status="processing" text="已满载" />;
      case 'disabled': return <Badge status="warning" text="已禁用" />;
      default: return <Badge status="default" text={status} />;
    }
  };

  const columns = [
    {
      title: '授权码 (卡密)',
      dataIndex: 'code',
      key: 'code',
      width: 190,
      render: (text: string) => (
        <Tooltip title="点击复制卡密">
          <span 
            onClick={async () => {
              try {
                await copyToClipboard(text);
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
      title: '所属应用',
      dataIndex: 'appName',
      key: 'appName',
      width: 120,
      render: (name: string | null) => name ? <Tag color="geekblue">{name}</Tag> : <Tag color="default">通用型</Tag>,
    },
    {
      title: '来源分类',
      dataIndex: 'source',
      key: 'source',
      width: 90,
      render: (source: string) => (
        source === 'IMPORT' ? <Tag color="cyan">导入</Tag> : <Tag color="blue">自建</Tag>
      ),
    },
    {
      title: '卡种类型',
      dataIndex: 'cardType',
      key: 'cardType',
      width: 90,
      render: (type: string) => getCardTypeLabel(type),
    },
    {
      title: '设备额度',
      key: 'usage',
      width: 100,
      render: (_: any, record: LicenseCode) => (
        <span className="font-mono font-semibold text-xs text-slate-600 dark:text-zinc-400">
          {record.currentActivations} / {record.maxActivations} 台
        </span>
      ),
    },
    {
      title: '绑定设备ID',
      dataIndex: 'deviceIds',
      key: 'deviceIds',
      width: 180,
      render: (deviceIds: string[] | null, record: LicenseCode) => {
        const ids = deviceIds || (record.deviceId ? [record.deviceId] : []);
        if (ids.length === 0) return <span className="text-slate-400 italic text-xs">暂无绑定</span>;
        
        const firstId = ids[0];
        const restIds = ids.slice(1);
        
        const renderDeviceTag = (dev: string) => (
          <Tooltip key={dev} title="点击查看设备运行状态与最新日志">
            <span 
              onClick={() => onDeviceClick?.(dev, record.code)}
              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-[0.97] transition-all"
            >
              <Cpu className="w-3.5 h-3.5" />
              {dev}
            </span>
          </Tooltip>
        );

        return (
          <Space size={[0, 6]} wrap className="max-w-[220px] py-1 select-none">
            {renderDeviceTag(firstId)}
            {restIds.length > 0 && (
              <Popover 
                content={<Space direction="vertical" size={4}>{restIds.map(renderDeviceTag)}</Space>} 
                title={<span className="text-xs font-bold text-slate-600 dark:text-slate-300">其他绑定设备</span>}
                trigger="click"
                placement="bottom"
              >
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all">
                  + {restIds.length} 台
                </span>
              </Popover>
            )}
          </Space>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: '到期时间',
      key: 'expiresAt',
      width: 150,
      render: (_: any, record: LicenseCode) => {
        if (record.cardType === 'YJ') return <span className="text-amber-500 font-bold">永久有效</span>;
        if (!record.expiresAt) return <span className="text-slate-400 italic text-xs">未激活，时长 {record.durationMinutes} 分钟</span>;
        return (
          <span className="text-xs font-mono text-slate-600 dark:text-zinc-400">
            {formatDateTime(record.expiresAt, false)}
          </span>
        );
      }
    },
    {
      title: '备注说明',
      dataIndex: 'remark',
      key: 'remark',
      width: 130,
      render: (text: string | null) => (
        <Tooltip title={text}>
          <span className="text-xs text-slate-400 truncate max-w-[120px] inline-block">{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '启用',
      key: 'enable',
      width: 70,
      render: (_: any, record: LicenseCode) => (
        <Switch
          checked={record.status !== 'disabled'}
          size="small"
          onChange={(checked) => handleStatusChange(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: LicenseCode) => {
        const items: MenuProps['items'] = [
          {
            key: 'adjust',
            label: (
              <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-350">
                <Clock className="w-3.5 h-3.5" />
                微调时长
              </span>
            ),
            onClick: () => onAdjustClick(record),
          },
          record.currentActivations > 0 ? {
            key: 'unbind',
            label: (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <RefreshCw className="w-3.5 h-3.5" />
                强制解绑
              </span>
            ),
            onClick: () => handleUnbind(record),
          } : null,
          {
            type: 'divider',
          },
          {
            key: 'revoke',
            label: (
              <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                注销销毁
              </span>
            ),
            onClick: () => handleRevoke(record.id, record.code),
          },
        ].filter(Boolean) as MenuProps['items'];

        return (
          <Space size="middle">
            <Button
              type="link"
              size="small"
              className="p-0 text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 font-bold"
              onClick={() => onConfigClick(record)}
            >
              <Settings className="w-3.5 h-3.5" />
              授权
            </Button>

            <Dropdown menu={{ items }} trigger={['click']}>
              <Button 
                type="text" 
                size="small" 
                className="flex items-center justify-center p-1 text-slate-400 hover:text-slate-750 dark:hover:text-zinc-200 cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm relative code-table-container">
      <Table 
        {...tableProps} 
        rowSelection={{
          selectedRowKeys,
          onChange: (keys: React.Key[]) => onSelectionChange(keys),
          fixed: true,
        }}
        columns={columns} 
        rowKey="id" 
        scroll={{ x: 1300, y: 'calc(100vh - 440px)' }}
        pagination={{
          ...tableProps.pagination,
          style: { marginRight: 16, marginBottom: 16 }
        }}
      />
    </div>
  );
}
