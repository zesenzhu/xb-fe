'use client';

import React from 'react';
import { Modal, Form, Select, InputNumber, Switch, Input, Button, message } from 'antd';
import { api } from '@/lib/axios';
import './style.scss';

export interface GenerateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function GenerateModal({
  open,
  onCancel,
  onSuccess,
}: GenerateModalProps) {
  const [form] = Form.useForm();

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
      form.resetFields();
      onSuccess();
    } catch (err: any) {
      message.error(err.message || '批量生成注册码失败');
    }
  };

  return (
    <Modal
      title="批量生成授权注册码"
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleGenerate}
        className="mt-4 generate-modal-form"
        initialValues={{ count: 5, maxActivations: 1, cardType: 'YK', durationMinutes: 43200, isGeneral: true }}
        onValuesChange={(changed) => {
          // 根据卡种联动更新预设时长
          if (changed.cardType) {
            let minutes = 43200; // 默认月卡 30天
            if (changed.cardType === 'SK') minutes = 60; // 1小时
            if (changed.cardType === 'TK') minutes = 1440; // 24小时
            if (changed.cardType === 'WK') minutes = 10080; // 7天
            if (changed.cardType === 'YK') minutes = 43200; // 30天
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
          <Button onClick={() => {
            form.resetFields();
            onCancel();
          }}>取消</Button>
          <Button type="primary" htmlType="submit">
            立即制卡
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
