'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Switch, Checkbox, Button, message } from 'antd';
import { ShieldAlert, Settings } from 'lucide-react';
import { api } from '@/lib/axios';

export interface BatchConfigModalProps {
  open: boolean;
  selectedRowKeys: React.Key[];
  onCancel: () => void;
  onSuccess: () => void;
}

export default function BatchConfigModal({
  open,
  selectedRowKeys,
  onCancel,
  onSuccess,
}: BatchConfigModalProps) {
  const [form] = Form.useForm();
  const [apps, setApps] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 拉取应用列表
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

  // 打开重置
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSelectedAppId(null);
    }
  }, [open, form]);

  const handleSave = async (values: any) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先在列表多选激活码');
      return;
    }
    setLoading(true);
    try {
      const appId = values.isGeneral ? null : values.appId;
      const allowedFeatures = values.isGeneral ? [] : (values.allowedFeatures || []);

      await api.patch('/register-codes/batch-config', {
        ids: selectedRowKeys,
        appId,
        allowedFeatures,
      });

      message.success(`批量更新了 ${selectedRowKeys.length} 个激活码的应用与权限配置成功！`);
      onSuccess();
    } catch (err: any) {
      message.error(err.message || '批量配置更新失败');
    } finally {
      setLoading(false);
    }
  };

  const selectedApp = apps.find((a) => a.id === selectedAppId);
  const appFeatures = selectedApp?.features || [];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500 animate-spin-slow" />
          <span>批量应用授权与功能权限配置</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={500}
    >
      <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/40 mb-4 text-xs space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-zinc-400">已选中激活码数:</span>
          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded text-sm">
            {selectedRowKeys.length} 个
          </span>
        </div>
        <p className="text-[11px] text-slate-400">保存后将统一覆盖这批激活码的关联应用以及拥有的细分脚本功能权限点。</p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        className="mt-4"
        initialValues={{ isGeneral: false }}
        onValuesChange={(changed) => {
          if (changed.isGeneral !== undefined) {
            setSelectedAppId(null);
            form.setFieldsValue({ appId: undefined, allowedFeatures: [] });
          }
        }}
      >
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
                <Form.Item name="appId" label="选择批量关联的游戏应用" rules={[{ required: true, message: '请选择关联的游戏应用' }]}>
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

              {appFeatures.length > 0 ? (
                <Form.Item name="allowedFeatures" label="分配该脚本细分功能权限">
                  <Checkbox.Group
                    options={appFeatures.map((f: any) => ({ label: f.name, value: f.code }))}
                  />
                </Form.Item>
              ) : (
                selectedAppId && (
                  <div className="text-xs text-amber-500 bg-amber-500/10 p-2.5 rounded border border-amber-500/20 mb-4 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>该应用下暂未配置任何功能权限点，激活码将默认拥有该应用的基础访问权。</span>
                  </div>
                )
              )}
            </>
          )}
        </Form.Item>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
          <Button onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            确认批量保存
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
