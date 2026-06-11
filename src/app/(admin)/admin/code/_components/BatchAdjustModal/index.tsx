'use client';

import React from 'react';
import { Modal, Form, Select, InputNumber, Input, Button, message } from 'antd';
import { Wrench } from 'lucide-react';
import { api } from '@/lib/axios';
import './style.scss';

export interface BatchAdjustModalProps {
  open: boolean;
  selectedRowKeys: React.Key[];
  onCancel: () => void;
  onSuccess: () => void;
}

export default function BatchAdjustModal({
  open,
  selectedRowKeys,
  onCancel,
  onSuccess,
}: BatchAdjustModalProps) {
  const [form] = Form.useForm();

  const handleBatchAdjustTime = async (values: any) => {
    try {
      const direction = values.direction === 'subtract' ? -1 : 1;
      let minutesFactor = 1;
      if (values.unit === 'hour') minutesFactor = 60;
      else if (values.unit === 'day') minutesFactor = 1440;
      else if (values.unit === 'week') minutesFactor = 10080;
      else if (values.unit === 'month') minutesFactor = 43200;
      else if (values.unit === 'year') minutesFactor = 525600;
      
      const totalMinutes = values.value * minutesFactor * direction;

      await api.patch('/register-codes/batch-adjust-time', {
        ids: selectedRowKeys,
        adjustMinutes: totalMinutes,
        reason: values.reason,
      });

      message.success(`批量微调时长成功！`);
      form.resetFields();
      onSuccess();
    } catch (err: any) {
      message.error(err.message || '批量微调时间失败');
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-500" />
          <span>批量时长微调控制台</span>
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
      <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 mb-4 text-xs text-amber-700 dark:text-amber-300 batch-adjust-warning">
        批量时长微调将**忽略其中的永久卡**，非永久卡的截止时间将在其原到期时间基础上进行累加或扣减。
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleBatchAdjustTime}
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
            确认批量调整
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
