#!/bin/bash

# 确保脚本遇到错误立即退出
set -e

echo "=== [1/2] 正在进行 TypeScript 严格类型检查 (tsc --noEmit) ==="
npx tsc --noEmit

echo "=== [2/2] 正在模拟 Next.js 生产环境构建编译 (next build) ==="
npm run build

echo "✓ 恭喜！前端代码 TypeScript 严格校验与生产编译打包 100% 成功！"
