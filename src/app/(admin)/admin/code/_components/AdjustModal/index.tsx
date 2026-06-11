'use client';

import React from 'react';
import { Modal, Form, Select, InputNumber, Input, Button, message } from 'antd';
import { Wrench } from 'lucide-react';
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

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-500" />
          <span>时长微调控制台</span>
        </div>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      footer={null}
      destroyOnClose
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

        <div className="flex justify-end gap-2 pt-3">
          <Button onClick={() => {
            form.resetFields();
            onCancel();
          }}>取消</Button>
          <Button type="primary" htmlType="submit">
            确认调整
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
