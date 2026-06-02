'use client';

import React from 'react';
import { useUserStore } from '@/store/useUserStore';

interface PermissionGuardProps {
  // 单个权限码 (如 'user:create') 或 权限码数组 (如 ['code:create', 'code:delete'])
  permission: string | string[];
  // 权限匹配判定模式：
  // 'any' 表示只需满足数组中的任意一个权限；
  // 'all' 表示必须满足数组中所有的权限。
  mode?: 'any' | 'all';
  // 权限不足时的占位节点，默认隐藏 (null)
  fallback?: React.ReactNode;
  // 校验通过时要渲染的子元素
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  mode = 'any',
  fallback = null,
  children,
}) => {
  // 从 Zustand Store 中提取权限列表
  const { permissions, isAuthenticated } = useUserStore();

  // 如果未登录，直接显示 fallback
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // 超级管理员通配符判定：如果包含 '*'，代表拥有全量系统权限
  const isSuperAdmin = permissions.includes('*');
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // 转化为数组统一处理
  const requiredPermissions = Array.isArray(permission) ? permission : [permission];

  // 匹配判定
  let hasPermission = false;
  if (mode === 'any') {
    // 任意一个匹配即可
    hasPermission = requiredPermissions.some((perm) => permissions.includes(perm));
  } else {
    // 所有都需要匹配
    hasPermission = requiredPermissions.every((perm) => permissions.includes(perm));
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
