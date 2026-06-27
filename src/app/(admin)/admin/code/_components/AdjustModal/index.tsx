'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, Button, message, Divider, Table, Tag, Badge, Tabs } from 'antd';
import { Wrench, RefreshCw, Lock, Unlock, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '@/lib/axios';
import { formatDateTime } from '@/lib/utils';
import { LicenseCode } from '../types';
import './style.scss';

export interface AdjustModalProps {
  open: boolean;
  selectedRecord: LicenseCode | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function AdjustModal({
  open,
  selectedRecord,
  onCancel,
  onSuccess,
}: AdjustModalProps) {
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [bindDevices, setBindDevices] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [blacklist, setBlacklist] = useState<any[]>([]);

  // 前端秒级计时器，用于动态刷新“已运行时间”
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    let t: any;
    if (open) {
      t = setInterval(() => setNow(new Date()), 1000);
    }
    return () => clearInterval(t);
  }, [open]);

  const getDurationStr = (connectedAtStr?: string) => {
    if (!connectedAtStr) return '--';
    const start = new Date(connectedAtStr);
    const diff = Math.max(0, now.getTime() - start.getTime());
    const secs = Math.floor(diff / 1000) % 60;
    const mins = Math.floor(diff / 60000) % 60;
    const hours = Math.floor(diff / 3600000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchDetails = async () => {
    if (!selectedRecord) return;
    setLoading(true);
    try {
      const [devs, hist, black]: any[] = await Promise.all([
        api.get('/register-codes/my-devices', { params: { code: selectedRecord.code } }),
        api.get('/register-codes/my-devices/history', { params: { code: selectedRecord.code } }),
        api.get('/register-codes/my-devices/blacklist', { params: { code: selectedRecord.code } }),
      ]);
      setBindDevices(devs || []);
      setHistoryList(hist || []);
      setBlacklist(black || []);
    } catch (err: any) {
      message.error(err.message || '加载绑定设备及历史失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && selectedRecord) {
      fetchDetails();
    }
  }, [open, selectedRecord]);

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
      form.resetFields();
      onSuccess();
    } catch (err: any) {
      message.error(err.message || '调整时长失败');
    }
  };

  const handleUnbindDevice = async (deviceId: string, deviceName: string) => {
    if (!selectedRecord) return;
    Modal.confirm({
      title: '强制解绑该物理设备',
      content: (
        <div>
          确定要解绑端侧物理设备 <Tag color="blue">{deviceName}</Tag> 吗？
          解绑后，该设备的在线挂机脚本TCP连接会被**即时Kick强踢下线**。
        </div>
      ),
      okText: '确定解绑',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.patch('/register-codes/my-devices/unbind', {
            code: selectedRecord.code,
            deviceId,
            operator: 'admin',
          });
          message.success('已成功解绑并强踢物理设备下线！');
          fetchDetails();
          onSuccess();
        } catch (err: any) {
          message.error(err.message || '解绑失败');
        }
      }
    });
  };

  const handleAddBlacklist = async (deviceId: string, deviceName: string) => {
    if (!selectedRecord) return;
    const reason = window.prompt(`请输入将物理设备 [ ${deviceName} ] 拉黑禁用的原因（选填）:`);
    if (reason === null) return;
    try {
      await api.post('/register-codes/my-devices/blacklist', {
        code: selectedRecord.code,
        deviceId,
        deviceName,
        reason,
        operator: 'admin',
      });
      message.success(`物理设备 [ ${deviceName} ] 已被该激活码彻底拉黑禁用！`);
      fetchDetails();
      onSuccess();
    } catch (err: any) {
      message.error(err.message || '拉黑设备失败');
    }
  };

  const handleRemoveBlacklist = async (deviceId: string, deviceName: string) => {
    if (!selectedRecord) return;
    Modal.confirm({
      title: '允许该设备重新绑定',
      content: `确认要将物理设备 [ ${deviceName} ] 从卡密黑名单移出解封吗？`,
      okText: '确认解封',
      onOk: async () => {
        try {
          await api.delete('/register-codes/my-devices/blacklist', {
            params: {
              code: selectedRecord.code,
              deviceId,
              operator: 'admin',
            }
          });
          message.success('黑名单解封成功！');
          fetchDetails();
        } catch (err: any) {
          message.error(err.message || '移出黑名单失败');
        }
      }
    });
  };

  const handleExportLogs = async (deviceId: string, deviceName: string) => {
    const key = 'export-logs';
    try {
      message.loading({ content: '正在生成日志文件并下载...', key });
      const response = await api.get<unknown, Blob>('/logs/export', {
        params: { deviceId },
        responseType: 'blob',
      });
      
      const blob = response;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `设备_${deviceName || deviceId}_24h日志.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success({ content: '日志导出下载成功！', key });
    } catch (err: any) {
      message.error({ content: err.message || '导出日志失败', key });
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-500" />
          <span>激活码微调与物理设备生命周期控制台</span>
        </div>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      footer={null}
      forceRender
      destroyOnHidden
      width={780}
    >
      {selectedRecord && (
        <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 mb-4 text-xs space-y-1.5 adjust-record-info">
          <div className="flex justify-between">
            <span className="text-slate-400">目标卡密:</span>
            <span className="font-mono font-bold">{selectedRecord.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">当前截止时间:</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {selectedRecord.cardType === 'YJ' ? '永久有效' : (selectedRecord.expiresAt ? formatDateTime(selectedRecord.expiresAt, false) : '未激活 (初始 ' + selectedRecord.durationMinutes + ' 分钟)')}
            </span>
          </div>
        </div>
      )}

      <Form
        form={form}
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

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={() => {
            form.resetFields();
            onCancel();
          }}>取消</Button>
          <Button type="primary" htmlType="submit">
            确认调整时长
          </Button>
        </div>
      </Form>

      <Divider className="my-5" />

      <Tabs 
        defaultActiveKey="1"
        size="small"
        items={[
          {
            key: '1',
            label: `当前绑定设备 (${bindDevices.length})`,
            children: (
              <Table
                loading={loading}
                dataSource={bindDevices}
                rowKey="id"
                size="small"
                pagination={false}
                className="custom-mini-table"
                columns={[
                  {
                    title: '物理设备',
                    key: 'device',
                    render: (_, r) => (
                      <div>
                        <div className="font-bold flex items-center gap-1.5 text-xs text-slate-800 dark:text-zinc-200">
                          <Cpu className="w-3.5 h-3.5 text-slate-500" />
                          {r.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">{r.id}</div>
                      </div>
                    )
                  },
                  {
                    title: '网络IP',
                    dataIndex: 'ip',
                    key: 'ip',
                    width: 110,
                    render: (text) => <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400">{text}</span>
                  },
                  {
                    title: '状态 / 运行时间',
                    key: 'status',
                    width: 140,
                    render: (_, r) => {
                      const isOnline = r.status === 'online';
                      return (
                        <div className="space-y-0.5">
                          <div>
                            <Badge status={isOnline ? 'success' : 'default'} text={isOnline ? '在线' : '离线'} />
                          </div>
                          {isOnline && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-extrabold">
                              运行: {getDurationStr(r.connectedAt)}
                            </div>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    title: '操作',
                    key: 'action',
                    width: 200,
                    render: (_, r) => (
                      <div className="flex gap-2">
                        <Button 
                          type="link" 
                          size="small" 
                          className="p-0 text-indigo-600 hover:text-indigo-500 font-bold"
                          onClick={() => handleExportLogs(r.id, r.name)}
                        >
                          导出日志
                        </Button>
                        <Button 
                          type="link" 
                          danger 
                          size="small" 
                          className="p-0 font-bold"
                          onClick={() => handleUnbindDevice(r.id, r.name)}
                        >
                          强制解绑
                        </Button>
                        <Button 
                          type="link" 
                          size="small" 
                          className="p-0 text-amber-600 hover:text-amber-500 font-bold"
                          onClick={() => handleAddBlacklist(r.id, r.name)}
                        >
                          拉黑并解绑
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            )
          },
          {
            key: '2',
            label: `解绑审计历史 (${historyList.length})`,
            children: (
              <Table
                loading={loading}
                dataSource={historyList}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 5 }}
                className="custom-mini-table"
                columns={[
                  {
                    title: '历史设备 ID',
                    key: 'device',
                    render: (_, r) => (
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-zinc-200">{r.deviceName || '未知设备'}</div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-550">{r.deviceId}</div>
                        <div className="text-[10px] text-slate-400">上次IP: {r.lastIp}</div>
                      </div>
                    )
                  },
                  {
                    title: '起止时间',
                    key: 'times',
                    render: (_, r) => (
                      <div className="text-[10px] text-slate-600 dark:text-zinc-400 space-y-0.5">
                        <div>绑定: {new Date(r.boundAt).toLocaleString('zh-CN')}</div>
                        <div>解绑: {new Date(r.unbindAt).toLocaleString('zh-CN')}</div>
                      </div>
                    )
                  },
                  {
                    title: '解绑方式',
                    dataIndex: 'unbindReason',
                    key: 'unbindReason',
                    width: 90,
                    render: (text) => (
                      <Tag color={text === 'admin' ? 'red' : 'default'}>
                        {text === 'admin' ? '管理员强解' : '用户自解'}
                      </Tag>
                    )
                  },
                  {
                    title: '操作',
                    key: 'action',
                    width: 80,
                    render: (_, r) => {
                      const isBlocked = blacklist.some(b => b.deviceId === r.deviceId);
                      return (
                        <Button 
                          type="link" 
                          danger 
                          size="small" 
                          className="p-0 font-bold"
                          disabled={isBlocked}
                          onClick={() => handleAddBlacklist(r.deviceId, r.deviceName || r.deviceId)}
                        >
                          {isBlocked ? '已拉黑' : '拉黑设备'}
                        </Button>
                      );
                    }
                  }
                ]}
              />
            )
          },
          {
            key: '3',
            label: `卡密拉黑名单 (${blacklist.length})`,
            children: (
              <Table
                loading={loading}
                dataSource={blacklist}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 5 }}
                className="custom-mini-table"
                columns={[
                  {
                    title: '设备信息',
                    key: 'device',
                    render: (_, r) => (
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-zinc-200">{r.deviceName}</div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">{r.deviceId}</div>
                      </div>
                    )
                  },
                  {
                    title: '拉黑时间',
                    dataIndex: 'blockedAt',
                    key: 'blockedAt',
                    render: (text) => <span className="text-xs text-slate-600 dark:text-zinc-400">{new Date(text).toLocaleString('zh-CN')}</span>
                  },
                  {
                    title: '拉黑原因',
                    dataIndex: 'reason',
                    key: 'reason',
                    render: (text) => <span className="text-xs text-slate-500">{text || '无'}</span>
                  },
                  {
                    title: '操作',
                    key: 'action',
                    width: 100,
                    render: (_, r) => (
                      <Button 
                        type="link" 
                        size="small" 
                        className="p-0 text-emerald-600 hover:text-emerald-500 font-bold"
                        onClick={() => handleRemoveBlacklist(r.deviceId, r.deviceName || r.deviceId)}
                      >
                        重新允许绑定
                      </Button>
                    )
                  }
                ]}
              />
            )
          }
        ]}
      />
    </Modal>
  );
}
