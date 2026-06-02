---
name: commenting-convention
description: 前端 Next.js/React/TypeScript 统一注释与自解释代码开发技能规范。要求在每次开发中清晰说明每一处核心逻辑。
---

# Next.js 前端代码注释与说明规约 (commenting-convention)

本技能包专为 Next.js 前端系统定制。当您在前端编写 React 组件、自定义 Hooks、Zustand Store、Axios 拦截器或 Next Middleware 时，**必须严格按照本规约进行全中文高保真注释说明**。

---

## 1. 核心注释原则

### 1.1 "Why, not What" 铁律
*   **严禁**编写无意义的直译代码逻辑的废话注释。例如：
    ```tsx
    // 错误示范：直译代码，毫无价值
    // 设置 count 状态为 count + 1
    setCount(count + 1);
    ```
*   **要求**：注释必须解释“为什么这样设计”、“背后的业务交互细节”以及“有什么隐藏的 UI 闪烁或状态更新死锁技术陷阱”。
    ```tsx
    // 正确示范：说明状态更新与性能优化背景
    // 性能阻断器：此处必须使用 useCallback 进行缓存，以防止该组件重新渲染时，
    // 传入 react-window 的 List 组件的 Row 产生物理地址变动，导致整个虚拟日志终端发生全量 DOM 重绘卡顿。
    const handleRowRender = useCallback(({ index, style }: any) => {
      // ...
    }, [logs]);
    ```

### 1.2 全量中文注释要求
根据系统级 `RULE[user_global]` 规定，所有注释、JSDoc 声明以及 JSX 中的注释说明文字**必须全部使用中文进行编写**，表达语调应专业、美观。

---

## 2. 物理文件与模块头部注释标准

每一个新增或重构的 React 组件或 TS 文件，**物理头部必须包含以下格式的 JSDoc 注释**：

```tsx
/**
 * @file: VirtualLogConsole.tsx
 * @description: 基于 react-window 虚拟列表的高并发自适应日志终端渲染组件。
 * @author: [Your Name / AI Assistant]
 * @date: 2026-06-02
 *
 * [核心职责]
 * 1. 虚拟渲染：利用定高行高 rowHeight 配合 List 限制真实 DOM 节点在 30 行以内；
 * 2. 内存削峰：监控 logs 长度，自动将超过 5000 条的头部数据 shift 淘汰，保障浏览器内存；
 * 3. 滚动锚定：数据追加时，自动 scrollToRow 定位到最新行；
 * 4. 暂停与导出：提供 Log Freezing 暂停开关与本地 Blob 格式日志极速导出下载。
 *
 * [使用场景]
 * - 对外用户端 `/user/log` 大屏页面作为中央控制台使用。
 */
```

---

## 3. React 组件 Props 接口注释标准

在编写 React 组件的入参 Interface (Props) 时，每个属性**必须附带详细的 JSDoc 说明**，方便 TS 编译器在悬浮提示时展示清晰的中文含义：

```typescript
export interface VirtualLogConsoleProps {
  /**
   * 从物理 WebSocket 信道实时接收并追加的原始日志文本数组。
   * 单行文本推荐格式: "[时间戳] [日志级别] [模块名称] 日志正文"
   */
  logs: string[];

  /**
   * 触发清空内存中所有日志队列的回调函数。
   * 通常会同时清空 Zustand 状态管理库中缓存的 Logs 数组。
   */
  onClear: () => void;

  /**
   * (可选) 终端渲染的初始高度，单位为像素 (px)。
   * @default 400
   */
  height?: number;
}
```

---

## 4. JSX 内部注释标准

在编写复杂的 TSX 页面结构时，如果某处嵌套结构或条件渲染比较晦涩，**必须在 JSX 内部使用 `{/* ... */}` 进行多行清晰注释**：

```tsx
return (
  <div className="relative w-full h-[400px]">
    {/* 
      1. 物理空状态占位拦截：
         当下位机尚未建立长连接或没有任何日志流推过来时，展示炫酷的黑客帝国风格空状态，
         避免空白区域让用户误以为系统死锁或连接断开。
    */}
    {displayLogs.length === 0 ? (
      <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600 font-mono">
        等待物理信道下位机推送日志帧...
      </div>
    ) : (
      <List
        height={400}
        width="100%"
        rowCount={displayLogs.length}
        rowHeight={26}
        rowComponent={Row}
        rowProps={{}} /* ⚠️ React 19 避坑占位，必不可少 */
      />
    )}
  </div>
);
```

---

## 5. 辅助自检与示例

*   **代码规范范例**：查看 [ComponentWithJSDoc.tsx](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/commenting-convention/examples/ComponentWithJSDoc.tsx) 获取 JSDoc 与 TSX 注释全量中文的完美代码参考。
