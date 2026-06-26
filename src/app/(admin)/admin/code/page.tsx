'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, message } from 'antd';
import { useTableQuery } from '@/hooks/useTableQuery';
import { api } from '@/lib/axios';

import CodeFilter from './_components/CodeFilter';
import CodeTable from './_components/CodeTable';
import LogTab from './_components/LogTab';
import GenerateModal from './_components/GenerateModal';
import AdjustModal from './_components/AdjustModal';
import BatchAdjustModal from './_components/BatchAdjustModal';
import BatchConfigModal from './_components/BatchConfigModal';
import ImportModal from './_components/ImportModal';
import { LicenseCode } from './_components/types';
import DeviceLogModal from './_components/DeviceLogModal';
import AppConfigModal from './_components/AppConfigModal';

export default function CodePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isBatchAdjustModalOpen, setIsBatchAdjustModalOpen] = useState(false);
  const [isBatchConfigModalOpen, setIsBatchConfigModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LicenseCode | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 物理设备状态详情与日志终端弹窗控制
  const [isDeviceLogModalOpen, setIsDeviceLogModalOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedDeviceCode, setSelectedDeviceCode] = useState<string>('');

  // 动态锁定外层 main 容器的高，隐藏其纵向滚动条，防止双滚动条
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      const originalOverflow = mainEl.style.overflow;
      mainEl.style.overflow = 'hidden';
      return () => {
        mainEl.style.overflow = originalOverflow;
      };
    }
  }, []);

  // 获取注册码列表
  const fetchCodes = async (params: { 
    page: number; 
    limit: number; 
    code?: string;
    appName?: string;
    cardType?: string;
    deviceId?: string;
    status?: string;
    isEnabled?: string;
    source?: string;
    expireRange?: [any, any] | null;
  }) => {
    try {
      const apiParams: any = {
        page: params.page,
        limit: params.limit,
        code: params.code || undefined,
        appName: params.appName || undefined,
        cardType: params.cardType || undefined,
        deviceId: params.deviceId || undefined,
        status: params.status || undefined,
        isEnabled: params.isEnabled || undefined,
        source: params.source || undefined,
      };

      if (params.expireRange && params.expireRange[0] && params.expireRange[1]) {
        apiParams.expireStart = params.expireRange[0].toISOString();
        apiParams.expireEnd = params.expireRange[1].toISOString();
      }

      const response: any = await api.get('/register-codes', {
        params: apiParams,
      });
      return {
        list: response.list || [],
        total: response.total || 0,
      };
    } catch (err: any) {
      message.error(err.message || '获取注册激活码列表失败');
      return { list: [], total: 0 };
    }
  };

  const { tableProps, filters, setFilters, refetch } = useTableQuery<any>({
    queryKey: ['codes'],
    fetchFn: fetchCodes,
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className="w-full animate-in fade-in duration-300">
      <Tabs
        defaultActiveKey="1"
        className="w-full"
        items={[
          {
            key: '1',
            label: <span className="font-bold px-1">激活码管理</span>,
            children: (
              <div className="space-y-4 mt-2">
                {/* 检索面板 + 全局操作栏 */}
                <CodeFilter
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={() => setFilters({})}
                  onSearch={refetch}
                  selectedRowKeys={selectedRowKeys}
                  onClearSelection={() => setSelectedRowKeys([])}
                  onSuccess={refetch}
                  onBatchAdjustClick={() => setIsBatchAdjustModalOpen(true)}
                  onBatchConfigClick={() => setIsBatchConfigModalOpen(true)}
                  onOpenImport={() => setIsImportModalOpen(true)}
                  onOpenGenerate={() => setIsModalOpen(true)}
                />

                {/* 核心数据展示表格 */}
                <CodeTable
                  tableProps={tableProps}
                  selectedRowKeys={selectedRowKeys}
                  onSelectionChange={setSelectedRowKeys}
                  onAdjustClick={(record) => {
                    setSelectedRecord(record);
                    setIsAdjustModalOpen(true);
                  }}
                  onConfigClick={(record) => {
                    setSelectedRecord(record);
                    setIsConfigModalOpen(true);
                  }}
                  onSuccess={refetch}
                  onDeviceClick={(deviceId, code) => {
                    setSelectedDeviceId(deviceId);
                    setSelectedDeviceCode(code);
                    setIsDeviceLogModalOpen(true);
                  }}
                />
              </div>
            )
          },
          {
            key: '2',
            label: <span className="font-bold px-1">修改日志查询</span>,
            children: <LogTab />
          }
        ]}
      />

      {/* 批量制卡弹窗 */}
      <GenerateModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          refetch();
        }}
      />

      {/* 单张时长微调弹窗 */}
      <AdjustModal
        open={isAdjustModalOpen}
        selectedRecord={selectedRecord}
        onCancel={() => {
          setSelectedRecord(null);
          setIsAdjustModalOpen(false);
        }}
        onSuccess={() => {
          setSelectedRecord(null);
          setIsAdjustModalOpen(false);
          refetch();
        }}
      />

      {/* 应用授权与细分功能权限配置弹窗 */}
      <AppConfigModal
        open={isConfigModalOpen}
        selectedRecord={selectedRecord}
        onCancel={() => {
          setSelectedRecord(null);
          setIsConfigModalOpen(false);
        }}
        onSuccess={() => {
          setSelectedRecord(null);
          setIsConfigModalOpen(false);
          refetch();
        }}
      />

      {/* 批量时长微调弹窗 */}
      <BatchAdjustModal
        open={isBatchAdjustModalOpen}
        selectedRowKeys={selectedRowKeys}
        onCancel={() => setIsBatchAdjustModalOpen(false)}
        onSuccess={() => {
          setIsBatchAdjustModalOpen(false);
          setSelectedRowKeys([]);
          refetch();
        }}
      />

      {/* 批量授权应用与权限弹窗 */}
      <BatchConfigModal
        open={isBatchConfigModalOpen}
        selectedRowKeys={selectedRowKeys}
        onCancel={() => setIsBatchConfigModalOpen(false)}
        onSuccess={() => {
          setIsBatchConfigModalOpen(false);
          setSelectedRowKeys([]);
          refetch();
        }}
      />

      {/* 导入老卡存量弹窗 */}
      <ImportModal
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* 物理设备运行快照与日志终端弹窗 */}
      <DeviceLogModal
        open={isDeviceLogModalOpen}
        deviceId={selectedDeviceId}
        code={selectedDeviceCode}
        onCancel={() => {
          setIsDeviceLogModalOpen(false);
          setSelectedDeviceId('');
          setSelectedDeviceCode('');
        }}
      />
    </div>
  );
}
