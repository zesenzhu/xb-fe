'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Switch, Input, Button, Checkbox, message } from 'antd';
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
  const [apps, setApps] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      api.get('/apps')
        .then((res: any) => {
          setApps(res || []);
        })
        .catch((err: any) => {
          message.error(err.message || '拉取应用列表失败');
        });
    }
  }, [open]);

  const handleGenerate = async (values: any) => {
    try {
      await api.post('/register-codes/generate', {
        count: values.count,
        maxActivations: values.maxActivations,
        appId: values.isGeneral ? undefined : values.appId,
        allowedFeatures: values.isGeneral ? [] : (values.allowedFeatures || []),
        cardType: values.cardType,
        durationMinutes: values.durationMinutes,
        remark: values.remark,
      });
      message.success(`成功批量生成 ${values.count} 个注册码！`);
      form.resetFields();
      setSelectedAppId(null);
      onSuccess();
    } catch (err: any) {
      message.error(err.message || '批量生成注册码失败');
    }
  };

  const selectedApp = apps.find((a) => a.id === selectedAppId);
  const appFeatures = selectedApp?.features || [];

  return (
    <Modal
      title="批量生成授权注册码"
      open={open}
      onCancel={() => {
        form.resetFields();
        setSelectedAppId(null);
        onCancel();
      }}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleGenerate}
        className="mt-4 generate-modal-form"
        initialValues={{ count: 5, maxActivations: 1, cardType: 'YK', durationMinutes: 43200, isGeneral: true }}
        onValuesChange={(changed, allValues) => {
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
          if (changed.isGeneral !== undefined) {
            setSelectedAppId(null);
            form.setFieldsValue({ appId: undefined, allowedFeatures: [] });
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
            if (checked) {
              setSelectedAppId(null);
              form.setFieldsValue({ appId: undefined, allowedFeatures: [] });
            }
          }} />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isGeneral !== curr.isGeneral}>
          {({ getFieldValue }) => !getFieldValue('isGeneral') && (
            <>
              {apps.length === 0 ? (
                <div className="text-xs text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 mb-4 flex flex-col gap-1.5 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️ 暂无可用游戏应用</span>
                  </div>
                  <p>当前系统内暂无启用的游戏应用，专用卡密必须关联具体的应用。请先前往 <a href="/admin/app" target="_blank" className="underline font-bold text-indigo-500 hover:text-indigo-400">应用管理</a> 新建游戏应用。</p>
                </div>
              ) : (
                <Form.Item name="appId" label="选择关联游戏应用" rules={[{ required: true, message: '请选择关联的游戏应用' }]}>
                  <Select
                    placeholder="选择已创建的应用"
                    onChange={(val) => {
                      setSelectedAppId(val);
                      form.setFieldsValue({ allowedFeatures: [] });
                    }}
                    options={apps.map(a => ({ value: a.id, label: `${a.name} (${a.appKey})` }))}
                  />
                </Form.Item>
              )}

              {appFeatures.length > 0 && (
                <Form.Item name="allowedFeatures" label="分配该脚本细分功能权限">
                  <Checkbox.Group
                    options={appFeatures.map((f: any) => ({ label: f.name, value: f.code }))}
                  />
                </Form.Item>
              )}
            </>
          )}
        </Form.Item>

        <Form.Item name="remark" label="管理员备注">
          <Input.TextArea rows={2} placeholder="可记录本次发卡客户名称、渠道或原因" />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-3">
          <Button onClick={() => {
            form.resetFields();
            setSelectedAppId(null);
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
