# XBNEST 智能前端系统架构设计说明

本项目为一套高性能、高吞吐、强安全的**智能后台控制与对外用户端一体化系统**的前端服务。基于 Next.js 框架，承载响应式页面渲染、极速路由拦截以及高并发长连接的数据展示。

---

## 1. 系统核心拓扑架构

前端由两个主要板块构成：管理员控制台（基于 Ant Design 5.x 核心 CRUD）和对外用户端大屏（基于 shadcn/ui + Socket.IO 长连接）。

```mermaid
graph TD
    %% 客户端层
    subgraph Frontend [Next.js 15 前端双端]
        Admin[管理员控制台 (AntD + shadcn)]
        User[对外用户端大屏 (shadcn + Socket.IO)]
    end

    %% 网关与后端层
    subgraph Backend [NestJS 核心后端]
        Gateway[HTTP API / WebSockets Gateway]
        AuthModule[JWT 鉴权 & RBAC 权限模块]
        MqttClient[NestJS MQTT 核心订阅器]
        AiService[AI Agent 调度与推理引擎]
    end

    %% 存储与通信层
    subgraph DataStore [底层数据与信道]
        DB[(PostgreSQL 关系型数据库)]
        Redis[(Redis 高性能缓存/限流缓冲)]
        EMQX[EMQX / MQTT Broker 物理信道]
    end

    %% 机器人端
    subgraph Edge [端侧智能硬件]
        Robots[机器人端 / 自动化模拟节点]
    end

    %% 数据流动关联
    Admin <-->|HTTP / JWT Cookie| Gateway
    User <-->|HTTP / WebSockets| Gateway
    
    Gateway <--> AuthModule
    Gateway <--> AiService
    
    Gateway <-->|Prisma ORM| DB
    Gateway <-->|Token & QPS Limit| Redis
    
    MqttClient <-->|TCP PubSub| EMQX
    Robots <-->|MQTT Topic| EMQX
    MqttClient -->|WebSockets 实时转发| User
```

---

## 2. 前端核心技术栈选型

*   **渲染框架**：Next.js 15.x App Router，混合服务端组件 (RSC) 与客户端组件 (CSR)。
*   **双组件库协同（创新方案）**：
    *   **Ant Design 5.x**：负责高密度的内部管理后台，主要包含用户 CRUD、角色权限多级树、注册码批量表单等；
    *   **shadcn/ui + Tailwind CSS**：负责对外轻量级的用户大屏（SaaS 扁平风设计，打包体极小，自适应移动端）以及 AI 对话终端。
*   **长连接与实时渲染**：
    *   **Socket.IO-client** 对接后端 Gateway，接收秒级日志流；
    *   **react-window 虚拟列表** 实现上万行高频终端日志不卡顿渲染，真实 DOM 节点控制在 30 行以内。

---

## 3. 前端核心功能模块

### 3.1 账号鉴权与 RBAC 权限控制
前端在 Next.js Edge Middleware 校验对应的 Cookie 访问令牌（`access_token` 对标管理端，`user_access_token` 对标用户端），并在 axios 拦截器中提供 401 队列挂起与无感自动续期刷新 Token 机制。

### 3.2 高并发实时脚本日志
用户端通过 Socket.IO 监听 `log_stream` 实时接收高并发日志并推入 Zustand Log Array。渲染端使用 `react-window` 虚拟窗口进行黑客终端风格的高亮解析，支持暂停监听和导出日志。

### 3.3 AI Agent 智能任务调试
集成 DeepSeek 等多模型，提供自然语言的系统操控能力。左侧面板热配置 Temperature 与 System Prompt，右侧展示打字机文字流与 DeepSeek-R1 深度思考思维链（think 标签包裹内容），并伴有 Agent 工具调用 Timeline 时序节点的物理联动，使 AI 操作逻辑完全透明。
