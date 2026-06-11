'use client';

import React, { useState } from 'react';
import { Modal, Button, message } from 'antd';
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/axios';
import './style.scss';

export interface ImportModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ImportModal({
  open,
  onCancel,
  onSuccess,
}: ImportModalProps) {
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<{ createdCount: number; updatedCount: number; message: string } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.xlsx')) {
        setFile(droppedFile);
      } else {
        message.error('只支持上传 .xls 或 .xlsx 格式的电子表格文件！');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
      } else {
        message.error('只支持上传 .xls 或 .xlsx 格式的电子表格文件！');
      }
    }
  };

  const handleImportSubmit = async () => {
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res: any = await api.post('/register-codes/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportResult({
        createdCount: res.createdCount ?? 0,
        updatedCount: res.updatedCount ?? 0,
        message: res.message || '导入成功',
      });
      onSuccess();
    } catch (err: any) {
      message.error(err.message || '导入失败，请重试');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setImportResult(null);
      onCancel();
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
          <span>导入老卡存量</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      maskClosable={!importing}
      closable={!importing}
    >
      <div className="mt-4 space-y-4 import-modal-content">
        {!importResult ? (
          <>
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">导入须知：</p>
                <p className="mt-0.5">1. 此操作专为老系统激活码迁移设计，必须使用老系统导出的原始 Excel 表格文件。</p>
                <p className="mt-0.5">2. <strong>如果系统内已存在相同的激活码，将直接覆盖更新</strong>其版本类型、应用名称、卡种类型、时长及过期时间，以文件为准。</p>
                <p className="mt-0.5">3. 导入的已激活老卡状态将设为使用中，并会清空绑定设备，以允许设备重新连接时首次绑定。</p>
              </div>
            </div>

            {!file ? (
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 drag-container ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]' 
                    : 'border-slate-200 dark:border-zinc-800 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-zinc-850/50'
                }`}
              >
                <input 
                  type="file" 
                  id="old-card-file" 
                  className="hidden" 
                  accept=".xls,.xlsx" 
                  onChange={handleFileChange}
                />
                <label htmlFor="old-card-file" className="cursor-pointer flex flex-col items-center justify-center">
                  <Upload className="w-10 h-10 text-indigo-500 mb-3 animate-pulse" />
                  <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                    拖拽老系统导出的 Excel 文件到此处，或 <span className="text-indigo-600 hover:underline">点击浏览</span>
                  </span>
                  <span className="text-xs text-slate-400 mt-1.5 font-medium">
                    支持 .xls (老系统默认格式) 或 .xlsx 格式
                  </span>
                </label>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-zinc-950 rounded-xl p-4 border border-slate-200 dark:border-zinc-800 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200 file-preview-box">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-700 dark:text-zinc-200 truncate max-w-[240px]">
                      {file.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <Button 
                  type="text" 
                  danger 
                  size="small" 
                  className="font-semibold text-xs h-8" 
                  disabled={importing}
                  onClick={() => setFile(null)}
                >
                  移除
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button disabled={importing} onClick={handleClose}>
                取消
              </Button>
              <Button 
                type="primary" 
                className="bg-indigo-600 hover:bg-indigo-500 font-bold"
                loading={importing}
                disabled={!file}
                onClick={handleImportSubmit}
              >
                {importing ? '正在同步并覆盖...' : '开始导入'}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300 import-result-panel">
            <div className="inline-flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">老卡数据同步完成</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 px-4">
                {importResult.message}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 mx-4">
              <div className="text-center">
                <div className="text-xs text-slate-400">全新录入注册码</div>
                <div className="text-2xl font-black text-slate-800 dark:text-zinc-200 mt-1 font-mono">
                  {importResult.createdCount} <span className="text-xs font-normal text-slate-500">条</span>
                </div>
              </div>
              <div className="text-center border-l border-slate-200 dark:border-zinc-800">
                <div className="text-xs text-slate-400">覆盖同步注册码</div>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                  {importResult.updatedCount} <span className="text-xs font-normal text-slate-500">条</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 px-4">
              <Button 
                type="primary" 
                className="font-bold w-full h-10"
                onClick={() => {
                  setFile(null);
                  setImportResult(null);
                  onCancel();
                }}
              >
                返回激活码列表
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
