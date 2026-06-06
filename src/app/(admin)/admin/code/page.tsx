'use client';

import React, { useState } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Form, Select, InputNumber, Switch, message, Tooltip, Badge } from 'antd';
import { Plus, Search, ShieldAlert, Cpu, Calendar, Clock, Wrench, RefreshCw, KeyRound } from 'lucide-react';
import { useTableQuery } from '@/hooks/useTableQuery';
import { PermissionGuard } from '@/components/business/PermissionGuard';
import { api } from '@/lib/axios';

interface LicenseCode {
  id: string;
  code: string;
  appName: string | null;
  cardType: string;
  durationMinutes: number;
  maxActivations: number;
  currentActivations: number;
  rateLimit: number;
  deviceId: string | null;
  status: 'unused' | 'active' | 'expired' | 'full' | 'disabled';
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  remark: string | null;
}

export default function CodePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LicenseCode | null>(null);
  
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();

  // 获取注册码列表
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

  // 批量生成
  const handleGenerate = async (values: any) => {
    try {
      await api.post('/register-codes/generate', {
        count: values.count,
        maxActivations: values.maxActivations,
        appName: values.isGeneral ? undefined : values.appName,
        cardType: values.cardType,
        durationMinutes: values.durationMinutes,
        remark: values.remark,
      });
      message.success(`成功批量生成 ${values.count} 个注册码！`);
      setIsModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      message.error(err.message || '批量生成注册码失败');
    }
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
          refetch();
        } catch (err: any) {
          message.error(err.message || '注销失败');
        }
      },
    });
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
          refetch();
        } catch (err: any) {
          message.error(err.message || '解绑失败');
        }
      },
    });
  };

  // 时长微调提交
  const handleAdjustTime = async (values: any) => {
    if (!selectedRecord) return;
    try {
      const direction = values.direction === 'subtract' ? -1 : 1;
      
      let minutesFactor = 1;
      if (values.unit === 'hour') minutesFactor = 60;
      else if (values.unit === 'day') minutesFactor = 1440;
      else if (values.unit === 'week') minutesFactor = 10080;
      else if (values.unit === 'month') minutesFactor = 43200;
      else if (values.unit === 'year') minutesFactor = 525600;
      
      const totalMinutes = values.value * minutesFactor * direction;

      await api.patch(`/register-codes/${selectedRecord.id}/adjust-time`, {
        adjustMinutes: totalMinutes,
        reason: values.reason,
      });

      let unitLabel = '分钟';
      if (values.unit === 'hour') unitLabel = '小时';
      else if (values.unit === 'day') unitLabel = '天';
      else if (values.unit === 'week') unitLabel = '周';
      else if (values.unit === 'month') unitLabel = '月';
      else if (values.unit === 'year') unitLabel = '年';

      message.success(`已成功微调时长: ${direction > 0 ? '+' : ''}${values.value} ${unitLabel}`);
      setIsAdjustModalOpen(false);
      adjustForm.resetFields();
      refetch();
    } catch (err: any) {
      message.error(err.message || '调整时长失败');
    }
  };

  // 状态开关
  const handleStatusChange = async (record: LicenseCode, checked: boolean) => {
    try {
      const targetStatus = checked ? 'active' : 'disabled';
      await api.patch(`/register-codes/${record.id}/status`, { status: targetStatus });
      message.success(`注册码已${checked ? '启用' : '禁用'}`);
      refetch();
    } catch (err: any) {
      message.error(err.message || '更改状态失败');
    }
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
      render: (text: string) => (
        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded select-all border border-slate-200 dark:border-zinc-700">
          {text}
        </span>
      ),
    },
    {
      title: '所属应用',
      dataIndex: 'appName',
      key: 'appName',
      render: (name: string | null) => name ? <Tag color="geekblue">{name}</Tag> : <Tag color="default">通用型</Tag>,
    },
    {
      title: '卡种类型',
      dataIndex: 'cardType',
      key: 'cardType',
      render: (type: string) => getCardTypeLabel(type),
    },
    {
      title: '设备额度',
      key: 'usage',
      render: (_: any, record: LicenseCode) => (
        <span className="font-mono font-semibold text-xs text-slate-600 dark:text-zinc-400">
          {record.currentActivations} / {record.maxActivations} 台
        </span>
      ),
    },
    {
      title: '绑定设备ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      render: (dev: string | null, record: LicenseCode) =>
        dev ? (
          <Space>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40">
              <Cpu className="w-3.5 h-3.5" />
              {dev}
            </span>
          </Space>
        ) : (
          <span className="text-slate-400 italic text-xs">暂无绑定</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: '到期时间',
      key: 'expiresAt',
      render: (_: any, record: LicenseCode) => {
        if (record.cardType === 'YJ') return <span className="text-amber-500 font-bold">永久有效</span>;
        if (!record.expiresAt) return <span className="text-slate-400 italic text-xs">未激活，时长 {record.durationMinutes} 分钟</span>;
        return (
          <span className="text-xs font-mono text-slate-600 dark:text-zinc-400">
            {record.expiresAt.replace('T', ' ').substring(0, 16)}
          </span>
        );
      }
    },
    {
      title: '备注说明',
      dataIndex: 'remark',
      key: 'remark',
      render: (text: string | null) => (
        <Tooltip title={text}>
          <span className="text-xs text-slate-400 truncate max-w-[120px] inline-block">{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '启用',
      key: 'enable',
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
      render: (_: any, record: LicenseCode) => (
        <Space size="middle">
          <Button
            type="link"
            size="small"
            className="p-0 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center gap-1 font-bold"
            onClick={() => {
              setSelectedRecord(record);
              setIsAdjustModalOpen(true);
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            微调
          </Button>

          {record.currentActivations > 0 && (
            <Button
              type="link"
              size="small"
              className="p-0 text-amber-600 hover:text-amber-700 font-bold"
              onClick={() => handleUnbind(record)}
            >
              解绑
            </Button>
          )}

          <PermissionGuard permission="code:delete">
            <Button
              type="link"
              danger
              size="small"
              className="font-bold p-0"
              onClick={() => handleRevoke(record.id, record.code)}
            >
              注销
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
          <h1 className="text-xl font-black">注册卡密中心</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            按应用和卡种批量制卡分发、进行剩余可用时长微调、远程设备强制踢线解绑与安全黑名单管控
          </p>
        </div>
        <PermissionGuard permission="code:create">
          <Button
            type="primary"
            className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-bold text-xs flex items-center gap-1 h-9"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            批量制卡
          </Button>
        </PermissionGuard>
      </div>

      {/* 过滤栏 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索卡密或激活码..."
            defaultValue={filters.code || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 border-slate-200 dark:border-zinc-800"
            allowClear
          />
        </div>
        <Button onClick={() => refetch()} className="text-xs h-9 dark:border-zinc-800 dark:bg-zinc-900">
          刷新列表
        </Button>
      </div>

      {/* 表格 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <Table {...tableProps} columns={columns} rowKey="id" />
      </div>

      {/* 生成弹窗 */}
      <Modal
        title="批量生成授权注册码"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerate}
          className="mt-4"
          initialValues={{ count: 5, maxActivations: 1, cardType: 'YK', durationMinutes: 43200, isGeneral: true }}
          onValuesChange={(changed, all) => {
            // 根据卡种联动更新预设时长
            if (changed.cardType) {
              let minutes = 43200; // 默认月卡 30天
              if (changed.cardType === 'SK') minutes = 60; // 1小时
              if (changed.cardType === 'TK') minutes = 1440; // 24小时
              if (changed.cardType === 'WK') minutes = 10080; // 7天
              if (changed.cardType === 'NK') minutes = 525600; // 365天
              if (changed.cardType === 'YJ') minutes = 52560000; // 100年
              form.setFieldsValue({ durationMinutes: minutes });
            }
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="cardType" label="卡种类型" rules={[{ required: true }]}>
              <Select options={[
                { value: 'SK', label: '时卡 (1小时)' },
                { value: 'TK', label: '天卡 (24小时)' },
                { value: 'WK', label: '周卡 (7天)' },
                { value: 'YK', label: '月卡 (30天)' },
                { value: 'NK', label: '年卡 (365天)' },
                { value: 'YJ', label: '永久卡' },
              ]} />
            </Form.Item>
            <Form.Item name="durationMinutes" label="有效时长 (分钟)" rules={[{ required: true, message: '请输入分钟数' }]}>
              <InputNumber min={1} className="w-full" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="count" label="制卡数量" rules={[{ required: true }]}>
              <InputNumber min={1} max={100} className="w-full" />
            </Form.Item>
            <Form.Item name="maxActivations" label="每码最大绑定设备数" rules={[{ required: true }]}>
              <InputNumber min={1} max={10} className="w-full" />
            </Form.Item>
          </div>

          <Form.Item name="isGeneral" label="通用型卡密 (解锁名下所有应用)" valuePropName="checked">
            <Switch onChange={(checked) => {
              if (checked) form.setFieldsValue({ appName: undefined });
            }} />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isGeneral !== curr.isGeneral}>
            {({ getFieldValue }) => !getFieldValue('isGeneral') && (
              <Form.Item name="appName" label="关联应用名称" rules={[{ required: true, message: '请输入需绑定的单一应用名称' }]}>
                <Input placeholder="例如: 某某刷金助手" />
              </Form.Item>
            )}
          </Form.Item>

          <Form.Item name="remark" label="管理员备注">
            <Input.TextArea rows={2} placeholder="可记录本次发卡客户名称、渠道或原因" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" className="bg-slate-900 hover:bg-slate-800">
              立即制卡
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 时长微调弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-500" />
            <span>时长微调控制台</span>
          </div>
        }
        open={isAdjustModalOpen}
        onCancel={() => setIsAdjustModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        {selectedRecord && (
          <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 mb-4 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">目标卡密:</span>
              <span className="font-mono font-bold">{selectedRecord.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">当前截止时间:</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                {selectedRecord.cardType === 'YJ' ? '永久有效' : (selectedRecord.expiresAt ? selectedRecord.expiresAt.replace('T', ' ').substring(0, 16) : '未激活 (初始 ' + selectedRecord.durationMinutes + ' 分钟)')}
              </span>
            </div>
          </div>
        )}

        <Form
          form={adjustForm}
          layout="vertical"
          onFinish={handleAdjustTime}
          initialValues={{ direction: 'add', value: 1, unit: 'day' }}
        >
          <div className="grid grid-cols-3 gap-3">
            <Form.Item name="direction" label="调整类型" rules={[{ required: true }]}>
              <Select options={[
                { value: 'add', label: '增加时长' },
                { value: 'subtract', label: '扣减时长' },
              ]} />
            </Form.Item>
            <Form.Item name="value" label="数值" rules={[{ required: true, message: '请输入数值' }]}>
              <InputNumber min={1} className="w-full" />
            </Form.Item>
            <Form.Item name="unit" label="时间单位" rules={[{ required: true }]}>
              <Select options={[
                { value: 'minute', label: '分钟' },
                { value: 'hour', label: '小时' },
                { value: 'day', label: '天' },
                { value: 'week', label: '周' },
                { value: 'month', label: '月' },
                { value: 'year', label: '年' },
              ]} />
            </Form.Item>
          </div>

          <Form.Item name="reason" label="调整原因 (将记入备注日志)" rules={[{ required: true, message: '请输入微调原因' }]}>
            <Input placeholder="例如: 停机维护补偿 2 天" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={() => setIsAdjustModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" className="bg-slate-900 hover:bg-slate-800">
              确认调整
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
