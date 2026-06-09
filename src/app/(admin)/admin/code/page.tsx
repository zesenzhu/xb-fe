'use client';

import React, { useState } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Form, Select, InputNumber, Switch, message, Tooltip, Badge, DatePicker, Tabs } from 'antd';
import { Plus, Search, ShieldAlert, Cpu, Calendar, Clock, Wrench, RefreshCw, KeyRound, Upload, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
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

  // 导入老系统注册码状态与辅助函数
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<{ createdCount: number; updatedCount: number; message: string } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile);
      } else {
        message.error('只支持上传 .xls 或 .xlsx 格式的电子表格文件！');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
      } else {
        message.error('只支持上传 .xls 或 .xlsx 格式的电子表格文件！');
      }
    }
  };

  const handleImportSubmit = async () => {
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res: any = await api.post('/register-codes/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportResult({
        createdCount: res.createdCount ?? 0,
        updatedCount: res.updatedCount ?? 0,
        message: res.message || '导入成功',
      });
      refetch();
    } catch (err: any) {
      message.error(err.message || '导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  // 获取注册码列表
  const fetchCodes = async (params: { 
    page: number; 
    limit: number; 
    code?: string;
    appName?: string;
    cardType?: string;
    deviceId?: string;
    status?: string;
    isEnabled?: string;
    expireRange?: [any, any] | null;
  }) => {
    try {
      const apiParams: any = {
        page: params.page,
        limit: params.limit,
        code: params.code || undefined,
        appName: params.appName || undefined,
        cardType: params.cardType || undefined,
        deviceId: params.deviceId || undefined,
        status: params.status || undefined,
        isEnabled: params.isEnabled || undefined,
      };

      if (params.expireRange && params.expireRange[0] && params.expireRange[1]) {
        apiParams.expireStart = params.expireRange[0].toISOString();
        apiParams.expireEnd = params.expireRange[1].toISOString();
      }

      const response: any = await api.get('/register-codes', {
        params: apiParams,
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

  const { tableProps, filters, setFilters, refetch } = useTableQuery<any>({
    queryKey: ['codes'],
    fetchFn: fetchCodes,
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleResetFilters = () => {
    setFilters({});
  };

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
              } catch (err) {
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
          {text.replace('T', ' ').substring(0, 19)}
        </span>
      ),
    },
  ];

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
        <Tooltip title="点击复制卡密">
          <span 
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                message.success('卡密已成功复制！');
              } catch (err) {
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
    <div className="w-full animate-in fade-in duration-300">
      <Tabs
        defaultActiveKey="1"
        className="w-full"
        items={[
          {
            key: '1',
            label: <span className="font-bold px-1">激活码管理</span>,
            children: (
              <div className="space-y-4 mt-2">
                {/* 顶部操作区 */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="text-xs text-slate-500 dark:text-zinc-400">
                    按应用和卡种批量制卡分发、进行剩余可用时长微调、远程设备强制解绑与安全管控
                  </div>
                  <div className="flex gap-2">
                    <PermissionGuard permission="code:create">
                      <Button
                        className="border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 font-bold text-xs flex items-center gap-1.5 h-9"
                        onClick={() => {
                          setFile(null);
                          setImportResult(null);
                          setIsImportModalOpen(true);
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        导入老卡存量
                      </Button>
                    </PermissionGuard>
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
                </div>

                {/* 检索面板 */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm animate-in fade-in duration-200">
                  <div className="flex flex-wrap gap-x-5 gap-y-3.5 items-end">
                    {/* 1. 授权码 */}
                    <div className="flex flex-col gap-1 w-full sm:w-48">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">授权码 (卡密)</span>
                      <Input
                        placeholder="搜索卡密..."
                        value={filters.code || ''}
                        onChange={(e) => handleFilterChange('code', e.target.value)}
                        className="h-9 border-slate-200 dark:border-zinc-800 rounded-lg w-full"
                        allowClear
                      />
                    </div>

                    {/* 2. 绑定设备ID */}
                    <div className="flex flex-col gap-1 w-full sm:w-48">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">绑定设备ID</span>
                      <Input
                        placeholder="搜索设备ID..."
                        value={filters.deviceId || ''}
                        onChange={(e) => handleFilterChange('deviceId', e.target.value)}
                        className="h-9 border-slate-200 dark:border-zinc-800 rounded-lg w-full"
                        allowClear
                      />
                    </div>

                    {/* 3. 所属应用 */}
                    <div className="flex flex-col gap-1 w-full sm:w-40">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">所属应用</span>
                      <Select
                        className="h-9 rounded-lg w-full"
                        placeholder="全部应用"
                        value={filters.appName || undefined}
                        onChange={(val) => handleFilterChange('appName', val)}
                        allowClear
                        options={[
                          { value: 'general', label: '通用型卡密' },
                          { value: '老系统导入', label: '老系统卡密' },
                        ]}
                        dropdownStyle={{ borderRadius: '8px' }}
                      />
                    </div>

                    {/* 4. 卡种类型 */}
                    <div className="flex flex-col gap-1 w-full sm:w-32">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">卡种类型</span>
                      <Select
                        className="h-9 rounded-lg w-full"
                        placeholder="全部卡种"
                        value={filters.cardType || undefined}
                        onChange={(val) => handleFilterChange('cardType', val)}
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
                    </div>

                    {/* 5. 卡密状态 */}
                    <div className="flex flex-col gap-1 w-full sm:w-32">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">卡密状态</span>
                      <Select
                        className="h-9 rounded-lg w-full"
                        placeholder="全部状态"
                        value={filters.status || undefined}
                        onChange={(val) => handleFilterChange('status', val)}
                        allowClear
                        options={[
                          { value: 'unused', label: '未激活' },
                          { value: 'active', label: '使用中' },
                          { value: 'full', label: '已满载' },
                          { value: 'expired', label: '已过期' },
                          { value: 'disabled', label: '已禁用' },
                        ]}
                      />
                    </div>

                    {/* 6. 服务状态 */}
                    <div className="flex flex-col gap-1 w-full sm:w-32">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">服务状态</span>
                      <Select
                        className="h-9 rounded-lg w-full"
                        placeholder="全部服务"
                        value={filters.isEnabled || undefined}
                        onChange={(val) => handleFilterChange('isEnabled', val)}
                        allowClear
                        options={[
                          { value: 'true', label: '启用中' },
                          { value: 'false', label: '已禁用' },
                        ]}
                      />
                    </div>

                    {/* 7. 到期时间范围 */}
                    <div className="flex flex-col gap-1 w-full sm:w-64">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">到期时间范围</span>
                      <DatePicker.RangePicker
                        className="h-9 border-slate-200 dark:border-zinc-800 rounded-lg w-full"
                        value={filters.expireRange || null}
                        onChange={(val) => handleFilterChange('expireRange', val)}
                        placeholder={['开始日期', '结束日期']}
                      />
                    </div>

                    {/* 检索操作按钮跟条件排在一起 */}
                    <div className="flex gap-2 ml-auto pb-[1px]">
                      <Button 
                        onClick={handleResetFilters} 
                        className="text-xs h-9 border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-lg"
                      >
                        清空筛选
                      </Button>
                      <Button 
                        type="primary"
                        onClick={() => refetch()} 
                        className="text-xs h-9 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 rounded-lg font-bold"
                      >
                        查询刷新
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 表格 */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <Table 
                    {...tableProps} 
                    columns={columns} 
                    rowKey="id" 
                    pagination={{
                      ...tableProps.pagination,
                      style: { marginRight: 16, marginBottom: 16 }
                    }}
                  />
                </div>
              </div>
            )
          },
          {
            key: '2',
            label: <span className="font-bold px-1">修改日志查询</span>,
            children: (
              <div className="space-y-4 mt-2 animate-in fade-in duration-200">
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

                    <div className="flex gap-2 ml-auto pb-[1px]">
                      <Button 
                        onClick={() => setLogFilters({})} 
                        className="text-xs h-9 border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-lg"
                      >
                        清空筛选
                      </Button>
                      <Button 
                        type="primary"
                        onClick={() => refetchLogs()} 
                        className="text-xs h-9 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 rounded-lg font-bold"
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
                    pagination={{
                      ...logTableProps.pagination,
                      style: { marginRight: 16, marginBottom: 16 }
                    }}
                  />
                </div>
              </div>
            )
          }
        ]}
      />

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

      {/* 导入老卡存量弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
            <span>导入老卡存量</span>
          </div>
        }
        open={isImportModalOpen}
        onCancel={() => {
          if (!importing) {
            setIsImportModalOpen(false);
            setFile(null);
            setImportResult(null);
          }
        }}
        footer={null}
        destroyOnClose
        maskClosable={!importing}
        closable={!importing}
      >
        <div className="mt-4 space-y-4">
          {!importResult ? (
            <>
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">导入须知：</p>
                  <p className="mt-0.5">1. 此操作专为老系统激活码迁移设计，必须使用老系统导出的原始 Excel 表格文件。</p>
                  <p className="mt-0.5">2. <strong>如果系统内已存在相同的激活码，将直接覆盖更新</strong>其版本类型、应用名称、卡种类型、时长及过期时间，以文件为准。</p>
                  <p className="mt-0.5">3. 导入的已激活老卡状态将设为使用中，并会清空绑定设备，以允许设备重新连接时首次绑定。</p>
                </div>
              </div>

              {!file ? (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]' 
                      : 'border-slate-200 dark:border-zinc-800 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-zinc-850/50'
                  }`}
                >
                  <input 
                    type="file" 
                    id="old-card-file" 
                    className="hidden" 
                    accept=".xls,.xlsx" 
                    onChange={handleFileChange}
                  />
                  <label htmlFor="old-card-file" className="cursor-pointer flex flex-col items-center justify-center">
                    <Upload className="w-10 h-10 text-indigo-500 mb-3 animate-pulse" />
                    <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                      拖拽老系统导出的 Excel 文件到此处，或 <span className="text-indigo-600 hover:underline">点击浏览</span>
                    </span>
                    <span className="text-xs text-slate-400 mt-1.5 font-medium">
                      支持 .xls (老系统默认格式) 或 .xlsx 格式
                    </span>
                  </label>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-zinc-950 rounded-xl p-4 border border-slate-200 dark:border-zinc-800 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-700 dark:text-zinc-200 truncate max-w-[240px]">
                        {file.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="text" 
                    danger 
                    size="small" 
                    className="font-semibold text-xs h-8" 
                    disabled={importing}
                    onClick={() => setFile(null)}
                  >
                    移除
                  </Button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button disabled={importing} onClick={() => {
                  setIsImportModalOpen(false);
                  setFile(null);
                }}>
                  取消
                </Button>
                <Button 
                  type="primary" 
                  className="bg-indigo-600 hover:bg-indigo-500 font-bold"
                  loading={importing}
                  disabled={!file}
                  onClick={handleImportSubmit}
                >
                  {importing ? '正在同步并覆盖...' : '开始导入'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
              <div className="inline-flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">老卡数据同步完成</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 px-4">
                  {importResult.message}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 mx-4">
                <div className="text-center">
                  <div className="text-xs text-slate-400">全新录入注册码</div>
                  <div className="text-2xl font-black text-slate-800 dark:text-zinc-200 mt-1 font-mono">
                    {importResult.createdCount} <span className="text-xs font-normal text-slate-500">条</span>
                  </div>
                </div>
                <div className="text-center border-l border-slate-200 dark:border-zinc-800">
                  <div className="text-xs text-slate-400">覆盖同步注册码</div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                    {importResult.updatedCount} <span className="text-xs font-normal text-slate-500">条</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 px-4">
                <Button 
                  type="primary" 
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-bold w-full h-10"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportResult(null);
                    setFile(null);
                  }}
                >
                  返回激活码列表
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
