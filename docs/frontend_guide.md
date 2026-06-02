# Next.js 核心前端模块与双端路由设计说明

前端系统基于 **Next.js 15.x (App Router) + TypeScript** 搭建，创造性地实现了**“一套 Next.js 项目、内部后台与对外用户端共享基础包但物理路由彻底隔离”**的高内聚架构。

---

## 1. 前端双端路由物理前缀划分

双端通过 App Router 的路由组（Route Groups）与目录分流：

```text
/Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/src/app
├── (auth)/                  # 管理端登录路由 (URL 表现: /login)
├── (admin)/                 # 管理端受保护路由 (URL 表现: /dashboard, /user, /role 等)
│   ├── layout.tsx           # 管理端两栏式左侧折叠 Layout (Ant Design 风格)
│   └── dashboard/           # 指标大屏、Recharts 可视化
└── user/                    # 用户端专属物理分组路由 (URL 表现: /user/*)
    ├── layout.tsx           # 用户端极简 SaaS 导航 Layout (shadcn/ui + 呼吸灯)
    ├── login/               # 用户端激活码/密码极客登录页
    └── log/                 # 实时日志虚拟窗口 (Socket.IO + react-window)
```

---

## 2. 核心机制底层实现逻辑

### 2.1 401 队列挂起与无感自动刷新 Token
当 AccessToken 过期，后端接口会返回 `401 Unauthorized`。前端 Axios 客户端 ([axios.ts](file:///Users/xiaobao/Desktop/code/个人/xbnestjs/frontend/src/lib/axios.ts)) 会截获此错误，将当前的原始请求放入一个 `failedQueue` 并标记 `isRefreshing = true`，使用一个独立的 Axios 实例访问后端的 `/auth/refresh` 接口续期。
*   **续期成功**：重新批量发送挂起的原始请求，用户完全察觉不到。
*   **续期失败**：清空缓存，并强制退登跳转回 `/login` 或 `/user/login`。

### 2.2 Next.js Middleware 双向独立 Cookie 鉴权
为防止在同一浏览器中并发登录管理员与普通用户时发生 Token 覆盖冲突，我们进行 Cookie 物理前缀隔离：
*   **管理员后台令牌**：校验 `access_token` Cookie。无令牌重定向至 `/login`。
*   **对外用户端令牌**：校验 `user_access_token` Cookie。无令牌重定向至 `/user/login`。
中间件在 Edge Runtime 极速对路径识别：
*   `/dashboard`, `/role`, `/code`, `/log`, `/device`, `/ai` 划分到管理员后台鉴权保护；
*   `/user/log`, `/user/device`, `/user/ai-record` 划分到用户端鉴权保护；
*   精确重定向，完全解耦。

### 2.3 react-window 虚拟列表定高滚动渲染
用户端通过 Socket.IO 监听 `log_stream` 实时接收高并发日志并推入 Zustand Log Array。渲染端使用 `react-window` 2.2.7 的 `<List>` 组件进行绘制：
*   **定高行渲染**：固定行高 `rowHeight={26}`，防止文本折行，极大提高极速滚屏性能。
*   **内存优化**：最大只在内存中保留最近 5000 行，其余头部移出，配合 `react-window` 始终保持网页内存与 DOM 节点微乎其微。
*   **滚动锚定**：采用 `listRef.current.scrollToRow` 实现尾部自动滚动定位。
*   **日志导出**：利用 HTML5 浏览器 `Blob` API，一键生成 `.log` 文件并自动创建物理 `<a>` 标签触发极速下载。

---

## 3. 双 UI 组件库协同防冲突规范

系统创新集成 `Ant Design 5.x` 与 `shadcn/ui (TailwindCSS)` 两套主流组件库：
1.  **Ant Design 5.x**：负责内部复杂的高效 CRUD、多级权限树配置和注册码表格开发；
2.  **shadcn/ui**：负责高颜值、现代扁平 SaaS 风的用户大屏自适应、AI 聊天 Bubble 及输入框；
3.  **防闪烁保障**：全局 `Providers.tsx` 注入 `@ant-design/nextjs-registry` 的 `<AntdRegistry>`，确保服务端渲染（SSR）首屏样式防闪烁；并在 `ConfigProvider` 中通过 `theme.darkAlgorithm` 与 Zustand 主题绑定实现全局一键暗黑模式转换。
