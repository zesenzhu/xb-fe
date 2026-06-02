'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { TablePaginationConfig } from 'antd';

export interface FetchParams {
  page: number;
  limit: number;
  [key: string]: any;
}

export interface FetchResult<T> {
  list: T[];
  total: number;
}

interface UseTableQueryOptions<T> {
  // Query 缓存主键，如 ['users']
  queryKey: any[];
  // 数据调取方法
  fetchFn: (params: FetchParams) => Promise<FetchResult<T>>;
  // 初始每页条数，默认 10
  defaultLimit?: number;
  // 初始额外的过滤条件，如 { username: 'test' }
  initialFilters?: Record<string, any>;
}

export function useTableQuery<T>({
  queryKey,
  fetchFn,
  defaultLimit = 10,
  initialFilters = {},
}: UseTableQueryOptions<T>) {
  // 1. 维护分页与筛选状态
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(defaultLimit);
  const [filters, setFiltersState] = useState<Record<string, any>>(initialFilters);

  // 2. 拼接完整的 Query Key，保证状态变化时 React Query 自动重新请求
  const fullQueryKey = [...queryKey, { page, limit, ...filters }];

  // 3. 使用 TanStack Query 调取并缓存服务端状态
  const { data, isLoading, isFetching, error, refetch } = useQuery<FetchResult<T>>({
    queryKey: fullQueryKey,
    queryFn: () => fetchFn({ page, limit, ...filters }),
    placeholderData: keepPreviousData, // 翻页时保留上一次的数据，防止页面闪烁
    staleTime: 5000, // 5秒缓存新鲜度
  });

  // 4. 处理 Ant Design Table 的 onChange 事件（包括翻页、条数改变）
  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current && pagination.current !== page) {
      setPage(pagination.current);
    }
    if (pagination.pageSize && pagination.pageSize !== limit) {
      setLimit(pagination.pageSize);
      setPage(1); // 改变每页条数时，重置回第一页
    }
  };

  // 5. 提供给外部用于手动更新筛选过滤条件的方法
  const setFilters = (newFilters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => {
    if (typeof newFilters === 'function') {
      setFiltersState((prev) => {
        const next = newFilters(prev);
        return next;
      });
    } else {
      setFiltersState(newFilters);
    }
    setPage(1); // 更新筛选条件时，自动重置回第一页
  };

  // 6. 自动构建可直接应用在 AntD Table 上的 props 结构
  const tableProps = {
    dataSource: data?.list || [],
    loading: isLoading || isFetching,
    onChange: handleTableChange,
    rowKey: 'id' as any, // 默认使用 id 属性作为行 key
    pagination: {
      current: page,
      pageSize: limit,
      total: data?.total || 0,
      showSizeChanger: true,
      showQuickJumper: true,
      pageSizeOptions: ['10', '20', '50', '100'],
      showTotal: (total: number) => `共 ${total} 条数据`,
    } as TablePaginationConfig,
  };

  return {
    // 列表核心数据
    list: data?.list || [],
    total: data?.total || 0,
    // 加载状态
    isLoading,
    isFetching,
    error,
    // 筛选状态
    page,
    limit,
    filters,
    setPage,
    setLimit,
    setFilters,
    refetch,
    // Table 直接绑定属性
    tableProps,
  };
}

export default useTableQuery;
