---
name: frontend-dev-guide
description: Next.js 15+ App Router, TS 严格约束, Ant Design 5.x & shadcn/ui 双组件库开发技能与踩坑指南。
---

# Next.js 双组件库协同与 TypeScript 开发技能规约 (frontend-dev-guide)

本技能包专为 Next.js 前端仓库设计。当您在该仓库进行任何 UI 设计、组件开发、或数据联调时，**必须完全遵循本规约**以保障系统稳定性。

---

## 1. 核心技能：双 UI 组件库防冲突与 SSR 防闪烁

本系统在同一个 Next.js 15 实例中并存了 `Ant Design 5.x` 和 `shadcn/ui (Tailwind CSS)` 两套体系。

### 1.1 样式与选择器隔离规范
*   **管理端后台 (`(admin)` 路由组)**：
    *   **唯一主选**：使用 **Ant Design 5.x** 开发。
    *   **规范**：利用 `@ant-design/cssinjs` 提取样式，全局 CSS 样式定义严禁使用高权重的元素选择器（如直接写 `div { ... }`），防止污染 shadcn 组件的 Tailwind 样式。
*   **对外用户端 (`user/` 路由组)**：
    *   **唯一主选**：使用 **shadcn/ui + Tailwind CSS** 开发。
    *   **规范**：严禁在此路由的页面中引入 AntD 的 Layout、Grid 等带有全局布局性质的组件。只允许引入局部的精细基础组件，以保证打包体积极其轻量。

### 1.2 SSR 首屏防闪烁 (Hydration Style Preserving)
为了防止 SSR 时 AntD 组件样式未载入导致的瞬间排版错乱闪烁：
*   所有页面或 Layout 必须处于 `frontend/src/app/Providers.tsx` 包裹中。
*   `Providers` 必须集成 `@ant-design/nextjs-registry` 提供的 `<AntdRegistry>` 进行防闪烁预注入。

---

## 2. 核心技能：TypeScript 严格类型约束与 React 19 避坑

项目采用全量 strict 校验，零 any 宽容。

### 2.1 状态数据与 API 契约声明
*   禁止使用泛泛的 `object` 类型，所有 API 请求及响应结果必须在 `src/types/` 下建立精准的 interface 声明。
*   与后端传输实体对齐：前端自定义的 `User`、`License`、`Log` 接口类型，应与后端 Prisma Schema 生成的类型结构一比一映射。

### 2.2 React 19 / react-window 2.2.7 类型防死锁规范
*   **类型死锁规避**：在使用新版 `react-window` 虚拟列表绘制日志终端时，不要使用其深层导出的 `List` 类型作为 `Row` 的强类型校验。
*   **正确做法**：行组件声明其入参（如 `index`, `style`）直接采用 `any`（见 [VirtualLogConsole.tsx](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/examples/VirtualLogConsole.tsx) 范例）。
*   **新 API 契约**：
    *   将 `FixedSizeList` 改为 `List`；
    *   将原 `itemCount` 变更为 `rowCount`；
    *   将原 `itemSize` 变更为 `rowHeight`；
    *   行渲染采用 `rowComponent={Row}` 属性传入，并且**必须**显式指定空占位属性 `rowProps={{}}`。
    *   滚动定位方法采用 `listRef.current.scrollToRow({ index, align })`。

---

## 3. 前端开发三大铁律

### 3.1 Base UI dropdown 触发器不再接受 `asChild`
*   新版 shadcn 的 `DropdownMenuTrigger` 基于 `@base-ui/react` 重新设计，**坚决不能添加 `asChild` 属性**。
*   如果添加了 `asChild`，会导致 Radix 与 Base UI 的底层触发逻辑锁死，下拉菜单无法弹出，且控制台抛出不可追踪的冒泡异常。
*   **解决方式**：扁平化写法。直接将 Button 的样式和点击交互附在触发器本体上（见 [DropdownCustom.tsx](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/examples/DropdownCustom.tsx)）。

### 3.2 useSearchParams 打包脱轨悬挂
*   在 Next.js 客户端组件中，凡是调用了 `useSearchParams()` 的组件，在执行 `next build` 时会因为缺少 SSR 静态上下文而导致整个构建流水线崩溃退出。
*   **解决方式**：必须在父路由页面中，将该组件放置在 `<React.Suspense>` 异步隔离盒子内。

### 3.3 401 JWT 物理隔离与自动刷新队列
*   管理员后台使用 `access_token` Cookie，普通用户端使用 `user_access_token` Cookie。
*   Axios 客户端必须在响应拦截器中捕捉 401，启用 `isRefreshing` 互斥锁，挂起并发请求到 `failedQueue` 数组，并通过独立的刷新实例去触发 `/auth/refresh` 续期。

---

## 4. 辅助开发脚本与示例

*   **编译验证脚本**：您可以通过运行 [build-verify.sh](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/scripts/build-verify.sh) 一键完成严格的 TS 编译与 Next 预打包自检。
*   **虚拟日志大屏组件样板**：查看 [VirtualLogConsole.tsx](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/examples/VirtualLogConsole.tsx)。
*   **Base UI 现代下拉组件样板**：查看 [DropdownCustom.tsx](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/examples/DropdownCustom.tsx)。
