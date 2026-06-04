'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, Space, Tag, Checkbox, Tree, message } from 'antd';
import { ShieldCheck, ShieldAlert, Plus, Save, Info } from 'lucide-react';

interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
}

const mockRoles: RoleItem[] = [
  { id: '1', name: '系统超级管理员', code: 'admin', description: '拥有系统至高无上的全量管理权限，可执行高危删除和授权动作', permissions: ['*'] },
  { id: '2', name: '运营维护专员', code: 'operator', description: '负责日常业务运营，包括注册码分发、在线监控和基础读写', permissions: ['dashboard:view', 'code:list', 'code:create', 'log:list', 'device:list'] },
  { id: '3', name: '灰度测试人员', code: 'tester', description: '进行功能版本灰度测试，具备日志和设备自检读取权', permissions: ['dashboard:view', 'log:list', 'device:list'] },
];

const permissionTreeData = [
  {
    title: '系统概览 (Dashboard)',
    key: 'dashboard',
    children: [
      { title: '查看指标与大屏 (dashboard:view)', key: 'dashboard:view' },
    ],
  },
  {
    title: '用户账户控制 (User Management)',
    key: 'user',
    children: [
      { title: '读取用户列表 (user:list)', key: 'user:list' },
      { title: '新建用户 (user:create)', key: 'user:create' },
      { title: '删除账户权限 (user:delete)', key: 'user:delete' },
    ],
  },
  {
    title: '注册激活码模块 (License Keys)',
    key: 'code',
    children: [
      { title: '读取注册码列表 (code:list)', key: 'code:list' },
      { title: '批量生成激活码 (code:create)', key: 'code:create' },
      { title: '作废停用心跳 (code:delete)', key: 'code:delete' },
    ],
  },
  {
    title: '诊断日志检索 (Terminal Logs)',
    key: 'log',
    children: [
      { title: '读取及关键字过滤 (log:list)', key: 'log:list' },
    ],
  },
  {
    title: 'MQTT 端侧监控 (Realtime MQTT)',
    key: 'device',
    children: [
      { title: '读取设备连接参数 (device:list)', key: 'device:list' },
      { title: '远程推送控制负载 (device:control)', key: 'device:control' },
    ],
  },
  {
    title: 'AI Agent 对话调试 (AI Sandbox)',
    key: 'ai',
    children: [
      { title: '开启 AI 对话执行 (ai:list)', key: 'ai:list' },
    ],
  },
];

export default function RolePage() {
  const [selectedRole, setSelectedRole] = useState<RoleItem>(mockRoles[1]); // 默认选中运营专员
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>(mockRoles[1].permissions);

  const handleSelectRole = (role: RoleItem) => {
    setSelectedRole(role);
    // 如果是超级管理员，默认勾选所有（模拟）
    if (role.code === 'admin') {
      setCheckedKeys(['*']);
    } else {
      setCheckedKeys(role.permissions);
    }
  };

  const handleCheck = (checked: any) => {
    setCheckedKeys(checked as React.Key[]);
  };

  const handleSavePermissions = () => {
    message.loading('正在将权限集写入 Redis 与 PostgreSQL...', 1.5).then(() => {
      message.success(`角色 [ ${selectedRole.name} ] 权限结构保存成功！共激活 ${checkedKeys.length} 个规则`);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 模块标头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">角色权限管理 (RBAC)</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            动态增删系统角色、划分细粒度接口与按钮权限码（映射 NestJS Guard），并在保存时热刷新用户的身份 Session
          </p>
        </div>
        <Button
          type="primary"
          className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-bold text-xs flex items-center gap-1 h-9"
          onClick={() => message.info('新建角色表单模块正在联调中')}
        >
          <Plus className="w-4 h-4" />
          创建新角色
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左栏：角色列表展示 (占 1 栏) */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">系统核心角色</h3>
          <div className="space-y-3">
            {mockRoles.map((role) => {
              const isSelected = selectedRole.id === role.id;

              return (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 outline-none ${
                    isSelected
                      ? 'bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-zinc-950 shadow-md'
                      : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{role.name}</span>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      isSelected
                        ? 'bg-slate-800 text-slate-200 dark:bg-zinc-100 dark:text-zinc-800'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                    }`}>
                      {role.code}
                    </span>
                  </div>
                  <p className={`text-xs mt-3 leading-relaxed font-medium ${
                    isSelected ? 'text-slate-300 dark:text-zinc-700' : 'text-slate-500 dark:text-zinc-400'
                  }`}>
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 右栏：折叠权限树分配 (占 2 栏) */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-indigo-500" />
                权限分配树控制 (Role: {selectedRole.name})
              </CardTitle>
              <CardDescription className="text-[10px] mt-1">勾选并调整该角色允许进入的菜单页面或执行的敏感按钮权限码</CardDescription>
            </div>
            {selectedRole.code !== 'admin' && (
              <Button
                type="primary"
                onClick={handleSavePermissions}
                className="bg-slate-900 hover:bg-slate-800 text-xs font-bold flex items-center gap-1 h-8"
              >
                <Save className="w-3.5 h-3.5" />
                保存角色配置
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6 flex-1 overflow-y-auto min-h-[300px]">
            {selectedRole.code === 'admin' ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 gap-3 text-center">
                <ShieldCheck className="w-12 h-12 text-emerald-500 animate-pulse" />
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-zinc-200">超级管理员已锁定全量权限</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    `admin` 角色是系统的至高决策者，自动继承通配符权限 `*`，不需要手动进行模块级细分授权。
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-100 dark:border-zinc-800 flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    提示：修改后该角色下绑定的所有用户的客户端 Session 会在下次调用 Axios 时触发 `401` 无感重连或静默更新权限列表。
                  </span>
                </div>
                {/* 引入 Ant Design Tree Checkbox */}
                <Tree
                  checkable
                  defaultExpandAll
                  onCheck={handleCheck}
                  checkedKeys={checkedKeys}
                  treeData={permissionTreeData}
                  className="font-medium text-xs dark:bg-zinc-900 border-none pt-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
