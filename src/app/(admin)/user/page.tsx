'use client';

import React, { useState } from 'react';
import { Table, Button, Input, Space, Tag, Modal, Form, Select, message } from 'antd';
import { Plus, Search, ShieldAlert } from 'lucide-react';
import { useTableQuery } from '@/hooks/useTableQuery';
import { PermissionGuard } from '@/components/business/PermissionGuard';
import { api } from '@/lib/axios';

interface UserItem {
  id: string;
  username: string;
  nickname: string;
  email: string;
  role: {
    id: string;
    name: string;
    description?: string;
  } | null;
  status: number;
  createdAt: string;
}

export default function UserPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [form] = Form.useForm();

  // 获取真实角色列表
  const fetchRoles = async () => {
    try {
      const res: any = await api.get('/users/roles');
      setRoles(res || []);
    } catch (err: any) {
      message.error(err.message || '获取可分配角色列表失败');
    }
  };

  // 定义真实数据获取器
  const fetchUsers = async (params: { page: number; limit: number; username?: string }) => {
    try {
      const response: any = await api.get('/users', {
        params: {
          page: params.page,
          limit: params.limit,
          search: params.username,
        },
      });
      return {
        list: response.list || [],
        total: response.total || 0,
      };
    } catch (err: any) {
      message.error(err.message || '获取用户列表失败');
      return { list: [], total: 0 };
    }
  };

  // 关联分页组件与查询
  const { tableProps, filters, setFilters, refetch } = useTableQuery<UserItem>({
    queryKey: ['users'],
    fetchFn: fetchUsers,
  });

  const handleSearch = (val: string) => {
    setFilters({ username: val });
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    fetchRoles();
  };

  const handleAddUser = async (values: any) => {
    try {
      await api.post('/users', values);
      message.success(`创建用户成功: ${values.nickname || values.username}`);
      setIsModalOpen(false);
      form.resetFields();
      refetch();
    } catch (err: any) {
      message.error(err.message || '创建用户失败');
    }
  };

  const handleDeleteUser = (id: string, name: string) => {
    Modal.confirm({
      title: '敏感操作确认',
      icon: <ShieldAlert className="text-red-500 w-6 h-6 inline-block mr-2" />,
      content: `您正在注销或删除用户 [ ${name} ]，删除后该用户将立即丢失系统访问 Session。是否继续？`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/users/${id}`);
          message.success(`成功删除用户: ${name}`);
          refetch();
        } catch (err: any) {
          message.error(err.message || '删除用户失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => <span className="font-bold text-slate-800 dark:text-slate-200">{text}</span>,
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text: string) => text || '-',
    },
    {
      title: '电子邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => text || '-',
    },
    {
      title: '所属角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: any) => (
        <Tag color={role?.name === '超级管理员' ? 'volcano' : 'geekblue'} className="font-semibold">
          {role?.name || '未分配角色'}
        </Tag>
      ),
    },
    {
      title: '账号状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => (
        <span className="inline-flex items-center gap-1.5 font-semibold text-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${status === 1 ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {status === 1 ? '正常激活' : '异常冻结'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: '操作选项',
      key: 'action',
      render: (_: any, record: UserItem) => (
        <Space size="middle">
          <PermissionGuard
            permission="user:delete"
            fallback={<span className="text-[10px] text-slate-400 italic">无权限删除</span>}
          >
            <Button
              type="link"
              danger
              size="small"
              className="font-semibold p-0"
              onClick={() => handleDeleteUser(record.id, record.nickname || record.username)}
            >
              删除
            </Button>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* 模块标头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">用户管理控制中心</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            管理全系统后台的账户登录分配、RBAC 角色设定与当前在线拦截状态
          </p>
        </div>
        <PermissionGuard permission="user:create">
          <Button
            type="primary"
            className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-bold text-xs flex items-center gap-1 h-9"
            onClick={handleOpenModal}
          >
            <Plus className="w-4 h-4" />
            新建用户
          </Button>
        </PermissionGuard>
      </div>

      {/* 搜索过滤工具栏 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索用户名、昵称或邮箱..."
            defaultValue={filters.username || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 border-slate-200 dark:border-zinc-800 hover:border-slate-400"
            allowClear
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button onClick={() => refetch()} className="text-xs h-9 dark:border-zinc-800 dark:bg-zinc-900">
            刷新列表
          </Button>
        </div>
      </div>

      {/* 数据 Table 表格展示 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <Table
          {...tableProps}
          columns={columns}
          className="border-none"
        />
      </div>

      {/* 新增用户弹窗 */}
      <Modal
        title="创建系统新用户"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        className="dark:bg-zinc-900"
      >
        <Form form={form} layout="vertical" onFinish={handleAddUser} className="mt-4" initialValues={{ password: '123456' }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="建议英文或拼音，如 zhangsan" />
          </Form.Item>
          <Form.Item name="password" label="初始登录密码" rules={[{ required: true, message: '请设置初始登录密码' }]}>
            <Input.Password placeholder="默认密码为 123456" />
          </Form.Item>
          <Form.Item name="nickname" label="真实昵称" rules={[{ required: true, message: '请输入用户昵称' }]}>
            <Input placeholder="如 张三" />
          </Form.Item>
          <Form.Item name="email" label="电子邮箱" rules={[{ required: true, type: 'email', message: '请输入有效的邮箱' }]}>
            <Input placeholder="如 zhangsan@xbnest.com" />
          </Form.Item>
          <Form.Item name="roleId" label="选择分配角色" rules={[{ required: true, message: '请分配角色' }]}>
            <Select placeholder="选择系统角色分配">
              {roles.map((r: any) => (
                <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" className="bg-slate-900 hover:bg-slate-800">
              确认创建
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
