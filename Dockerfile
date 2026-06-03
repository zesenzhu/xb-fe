# ==========================================
# 1. 依赖安装阶段 (Deps Stage)
# ==========================================
FROM node:22-alpine AS deps
# 针对 libc 的兼容性处理 (部分依赖可能需要)
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖描述文件
COPY package.json pnpm-lock.yaml ./

# 允许所有的依赖在非交互式环境中运行构建脚本以避免 ERR_PNPM_IGNORED_BUILDS，并使用平铺模式 (hoisted) 安装防止多阶段构建 COPY 软链断裂
RUN echo "dangerouslyAllowAllBuilds: true" > pnpm-workspace.yaml && echo "node-linker: hoisted" >> pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

# ==========================================
# 2. 编译构建阶段 (Builder Stage)
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

# 拷贝依赖包与所有源代码
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 接收并注入 Next.js 的静态编译环境变量
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

# 物理执行 Next.js 生产环境打包
RUN pnpm run build

# ==========================================
# 3. 运行阶段 (Runner Stage)
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 物理创建系统受限运行组及账户，避免使用 root 带来的容器安全隐患
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 拷贝 Next.js 编译产物公共资源及 standalone 独立运行引擎
COPY --from=builder /app/public ./public

# 适配 Next.js 15+ standalone 构建输出的物理权限
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 拷贝 standalone 包 (包含精简的 node_modules 依赖) 和静态资源
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换为安全账户身份执行
USER nextjs

# 暴露前端端口 (规范设定为 8080)
EXPOSE 8080

# 绑定网络环境与端口变量
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# 物理拉起前端服务
CMD ["node", "server.js"]
