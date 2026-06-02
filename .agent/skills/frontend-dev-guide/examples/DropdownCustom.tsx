import React from 'react';
// 模拟新版 shadcn 采用的 Base UI 物理下拉菜单组件
// 注意：DropdownMenuTrigger 在 Base UI 中严禁添加 asChild！
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './mock-dropdown-components';

export function DropdownCustom() {
  return (
    <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 max-w-sm flex items-center justify-between">
      <span className="text-xs text-zinc-400 font-mono">操作菜单示例:</span>
      
      <DropdownMenu>
        {/* 
          ⚠️ 避坑铁律：
          DropdownMenuTrigger 在 @base-ui/react / 新版 shadcn 下，绝不能写 asChild！
          必须直接扁平化，将所有的 Tailwind 样式、点击态及 hover 态加在 Trigger 元素本身。
        */}
        <DropdownMenuTrigger className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all text-xs font-semibold text-zinc-100 rounded-md border border-zinc-700/50">
          管理选项
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-48 bg-zinc-950 border border-zinc-800/80 p-1.5 rounded-lg shadow-2xl animate-in fade-in duration-100">
          <DropdownMenuItem className="flex items-center px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-md cursor-pointer transition-all">
            编辑用户
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-md cursor-pointer transition-all">
            配置权限
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center px-2 py-1.5 text-xs text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-md cursor-pointer transition-all border-t border-zinc-900 mt-1">
            注销账户
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
