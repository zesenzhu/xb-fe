'use client';

import React, { useState } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Form, Select, InputNumber, Switch, message } from 'antd';
import { Plus, Search, ShieldAlert, Cpu } from 'lucide-react';
import { useTableQuery } from '@/hooks/useTableQuery';
import { PermissionGuard } from '@/components/business/PermissionGuard';
import { api } from '@/lib/axios';

interface LicenseCode {
  id: string;
  code: string;
  maxActivations: number;
  currentActivations: number;
  rateLimit: number; // QPS
  deviceId: string | null;
  status: 'active' | 'disabled';
  expiresAt: string;
}

export default function CodePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 定义真实数据获取器
  const fetchCodes = async (params: { page: number; limit: number; code?: string }) => {
    try {
      const response: any = await api.get('/register-codes', {
        params: {
          page: params.page,
          limit: params.limit,
          code: params.code,
        },
      });
      return {
        list: response.list || [],
        total: response.total || 0,
      };
    } catch (err: any) {
      message.error(err.message || '获取注册激活码列表失败');
      return { list: [], total: 0 };
    }
  };

  const { tableProps, filters, setFilters, refetch } = useTableQuery<LicenseCode>({
    queryKey: ['codes'],
    fetchFn: fetchCodes,
  });

  const handleSearch = (val: string) => {
    setFilters({ code: val });
  };

  const handleGenerate = async (values: any) => {
    try {
      await api.post('/register-codes/generate', {
        count: values.count,
        maxActivations: values.maxActivations,
        rateLimit: values.rateLimit,
      });
      message.success(`成功批量生成 ${values.count} 个注册码！`);
      setIsModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      message.error(err.message || '批量生成注册码失败');
    }
  };

  const handleRevoke = (id: string, code: string) => {
    Modal.confirm({
      title: '作废激活码确认',
      icon: <ShieldAlert className="text-red-500 w-6 h-6 inline-block mr-2" />,
      content: `您正在作废并解绑激活码 [ ${code} ]，解绑后绑定的端侧设备将立即掉线并清空 Redis 占用缓存。是否确认？`,
      okText: '确定作废',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/register-codes/${id}`);
          message.success(`成功停用作废激活码: ${code}`);
          refetch();
        } catch (err: any) {
          message.error(err.message || '作废激活码失败');
        }
      },
    });
  };

  const handleStatusChange = async (record: LicenseCode, checked: boolean) => {
    try {
      const targetStatus = checked ? 'active' : 'disabled';
      await api.patch(`/register-codes/${record.id}/status`, { status: targetStatus });
      message.success(`激活码 ${record.code} 状态已更新为: ${checked ? '启用' : '禁用'}`);
      refetch();
    } catch (err: any) {
      message.error(err.message || '更新激活码状态失败');
    }
  };

  const columns = [
    {
      title: '注册激活码',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => (
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded select-all border border-slate-200 dark:border-zinc-700">
          {text}
        </span>
      ),
    },
    {
      title: '激活额度 / 已用',
      key: 'usage',
      render: (_: any, record: LicenseCode) => (
        <span className="font-semibold text-xs text-slate-600 dark:text-zinc-400">
          {record.currentActivations} / {record.maxActivations} 次
        </span>
      ),
    },
    {
      title: '限流阀值 (QPS)',
      dataIndex: 'rateLimit',
      key: 'rateLimit',
      render: (qps: number) => <Tag color="orange" className="font-bold font-mono">{qps} Req/Sec</Tag>,
    },
    {
      title: '绑定设备',
      dataIndex: 'deviceId',
      key: 'deviceId',
      render: (dev: string | null) =>
        dev ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <Cpu className="w-3.5 h-3.5" />
            {dev}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">暂无绑定设备</span>
        ),
    },
    {
      title: '启用开关',
      key: 'status',
      render: (_: any, record: LicenseCode) => (
        <Switch
          checked={record.status === 'active'}
          size="small"
          onChange={(checked) => handleStatusChange(record, checked)}
        />
      ),
    },
    {
      title: '过期截止时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LicenseCode) => (
        <Space size="middle">
          <PermissionGuard permission="code:delete">
            <Button
              type="link"
              danger
              size="small"
              className="font-semibold p-0"
              onClick={() => handleRevoke(record.id, record.code)}
            >
              作废回收
            </Button>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">注册激活码分发控制台</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            批量生成激活注册码、限定设备激活上限、配置底层 Redis QPS 限流阀值并进行黑名单回收
          </p>
        </div>
        <PermissionGuard permission="code:create">
          <Button
            type="primary"
            className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-bold text-xs flex items-center gap-1 h-9"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            批量生成注册码
          </Button>
        </PermissionGuard>
      </div>

      {/* 过滤栏 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索注册码..."
            defaultValue={filters.code || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 border-slate-200 dark:border-zinc-800"
            allowClear
          />
        </div>
        <Button onClick={() => refetch()} className="text-xs h-9 dark:border-zinc-800 dark:bg-zinc-900">
          刷新注册码
        </Button>
      </div>

      {/* 表格 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <Table {...tableProps} columns={columns} />
      </div>

      {/* 生成弹窗 */}
      <Modal
        title="批量生成注册码"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleGenerate} className="mt-4" initialValues={{ count: 1, maxActivations: 1, rateLimit: 5 }}>
          <Form.Item name="count" label="生成数量" rules={[{ required: true, message: '请输入生成数量' }]}>
            <InputNumber min={1} max={100} className="w-full" placeholder="如批量生成 5 个" />
          </Form.Item>
          <Form.Item name="maxActivations" label="每码最大激活设备上限" rules={[{ required: true, message: '请设定激活上限' }]}>
            <InputNumber min={1} max={10} className="w-full" placeholder="通常为一码一机 (1)" />
          </Form.Item>
          <Form.Item name="rateLimit" label="限流阀值 (Redis QPS)" rules={[{ required: true, message: '请分配限流阀值' }]}>
            <InputNumber min={1} max={100} className="w-full" placeholder="限定该激活码设备每秒最大 API 请求数 (5)" />
          </Form.Item>
          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" className="bg-slate-900 hover:bg-slate-800">
              确认生成
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
