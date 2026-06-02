# XBNEST 智能前端开发助理指南 (AGENTS.md)

> [!NOTE]
> 本文档是专为 AI 编程助手（如 Antigravity、Cursor、Claude-Dev）及前端开发者编写的**系统级前端开发规约与避坑指南**。
> 本仓库已在 `.agent/` 专属目录下内置了核心开发技能体系（Skills）。当您在此仓库进行任何代码编写、模块重构、TS 类型修改或 UI 组件新增时，**必须首先阅读并加载系统技能包**。

---

## 🛠 本仓库内置 AI 技能包说明 (AI Skills)

我们为前端开发创建了专用的技能扩展包，其中封装了严格的 TS 规范、双组件库协同机制、注释规约、React 19 避坑以及高保真实践代码：

### 1. 📝 代码注释与说明规范技能包 (commenting-convention)
*   **技能定义文件**：[frontend/.agent/skills/commenting-convention/SKILL.md](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/commenting-convention/SKILL.md)
*   **开发金科铁律**：**每次开发、新增或重构代码都必须附带清晰、自解释的全中文说明**。杜绝直译代码的废话注释，深度阐述“Why, not What”。
*   **附属资产**：[ComponentWithJSDoc.tsx (JSDoc 与 TSX 规范组件样板)](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/commenting-convention/examples/ComponentWithJSDoc.tsx)

### 2. ⚡️ 高性能前端架构开发技能包 (frontend-dev-guide)
*   **技能定义文件**：[frontend/.agent/skills/frontend-dev-guide/SKILL.md](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/SKILL.md)
*   **开发金科铁律**：双组件库防冲突防闪烁、React 19 / react-window 2.2.x 类型死锁解决方案、Base UI 不兼容 `asChild` 的扁平化设计、以及 5000 条长连接日志缓存淘汰策略。
*   **附属资产**：
    *   **一键 TS 校验与 Next.js 生产构建自检脚本**：[build-verify.sh](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/scripts/build-verify.sh)
    *   **React 19 & react-window 2.2.7 高性能虚拟日志列表范例**：[VirtualLogConsole.tsx](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/examples/VirtualLogConsole.tsx)
    *   **Base UI Dropdown 无 `asChild` 现代下拉组件范例**：[DropdownCustom.tsx](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/examples/DropdownCustom.tsx)

---

## 1. 项目概览与极速启动

本项目为一个前后端分离架构的前端应用，统一承载管理员控制台与对外用户大屏端。

*   **前端物理路径**：`file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend`
*   **技术栈**：Next.js 15.x (App Router) + React 19 + TypeScript + Zustand + Tailwind CSS + Ant Design 5.x + shadcn/ui。
*   **启动命令**：`npm run dev` 或 `pnpm dev`

---

## 2. 双组件库协同与防冲突规范

项目在同一个 Next.js 15 应用中集成了 `Ant Design 5.x` 与 `shadcn/ui (Tailwind CSS)` 两套组件库。为了保证两套库和谐并存、样式不冲突且首屏无闪烁，请遵守以下设计契约：

### 2.1 职责边界划分
*   **管理后台端 (Admin Portal，路由组 `(admin)`)**：
    *   **首选 Ant Design 5.x**。用于高密度的 CRUD 数据表格、批量操作表单、多级权限树配置、以及统计图表展示。
*   **对外用户端 (Client Portal，路由 `/user/*`)**：
    *   **首选 shadcn/ui + Tailwind CSS**。用于极简 SaaS 风格大屏、个人设备状态面板、AI 聊天 Bubble 及输入控制框。

---

## 3. TypeScript 类型约束与避坑指南

项目采用**全量 TypeScript 严格类型约束**，严禁滥用 `any`。

### 3.1 接口响应契约
*   所有的接口数据请求和响应都必须有对应的类型声明。前端的 API 响应结构应与后端 Model 或自定义 DTO 契约强一致。

### 3.2 React 19 & react-window 2.2.7 重大 API 变更与类型避坑
*   **类型死锁规避**：对行渲染组件的参数声明，建议**直接设为 `any`**。如果强行使用 `react-window` 强类型，会导致深层递归类型推导死锁，抛出极其复杂的编译错误。
*   **新 API 契约**：将 `FixedSizeList` 改为 `List`；将原 `itemCount`/`itemSize` 变更为 `rowCount`/`rowHeight`；`ref` 改为 `listRef`；行渲染采用 `rowComponent={Row}` 属性传入，并且**必须**显式指定空占位属性 `rowProps={{}}`（具体代码参考内置技能包中的 [VirtualLogConsole.tsx](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/.agent/skills/frontend-dev-guide/examples/VirtualLogConsole.tsx)）。

---

## 4. 前端开发三大铁律

1.  **Base UI 触发器铁律**：`DropdownMenuTrigger` **不再兼容原 Radix-ui 的 `asChild` 属性**。必须扁平化，将所有的 Tailwind 样式、点击态及 hover 态加在 Trigger 元素本身。
2.  **searchParams 静态编译铁律**：在 Next.js App Router 客户端组件中，凡是调用了 `useSearchParams()` 的组件，在路由页面中**必须使用 `<React.Suspense>` 异步隔离盒子包裹**。
3.  **401 队列请求无感刷新 Token 物理隔离**：管理员端验证 `access_token`，普通用户端验证 `user_access_token`，在 Axios 拦截阶段挂起至队列并自动触发无感续期。

---

## 5. AI 助手承诺与输出原则
1.  **使用中文输出**：严格遵守全局规则，在此仓库编写的所有代码注释、提交信息以及技术方案建议必须**全中文**，表达清晰、语调专业、保持谦逊。
2.  **不引入多余的 ad-hoc 样式**：优先寻找并复用 Tailwind配置的类名或 AntD 的全局 token，绝不在 JSX 中混杂随意的手写内联样式。
3.  **不使用 placeholder 占位符**：编写新组件时，应全部使用可运行的高保真代码，如果需要配图一律使用 `generate_image` 产生可用真实演示资产，坚决杜绝 “待实现” 等无效空代码。
