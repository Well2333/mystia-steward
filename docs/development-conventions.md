# 开发约定与流程

更新日期：2026-04-13
适用范围：本仓库日常开发、规则调整、代码审查与文档维护

## 1. 记忆与知识治理

- 仓库长期记忆、项目状态与全局知识，统一存放在 docs 目录。
- 禁止将仓库级长期记忆沉淀到仓库外部或其他非 docs 目录。
- 代码或规则发生变化后，必须同步更新相关 docs 文档，避免文档与实现脱节。

## 2. 代码与架构约定

- TypeScript 使用 strict 模式写法，避免引入 any。
- src 下模块导入统一使用 @/ 路径别名。
- 推荐算法边界：
  - 普客逻辑集中在 src/lib/normal-recommend.ts
  - 稀客逻辑集中在 src/lib/rare-recommend.ts
  - Tag 冲突与评分规则集中在 src/lib/tags.ts
- 全局状态与持久化统一在 src/stores/game-store.ts。
- 结构化业务数据以 src/data/*.json 为唯一事实来源。

## 3. 开发与验证命令

- 安装依赖：pnpm install
- 本地开发：pnpm dev
- 静态检查：pnpm lint
- 构建验证：pnpm build
- 构建预览：pnpm preview
- Playwright 高级验收：仅在用户主动提及时执行，按 .github/skills/playwright-web-smoke/SKILL.md 流程进行
- Playwright 产物目录：统一写入 .playwright-cli/tmp/YYYY-MM-DD_HH:MM/，避免污染 .playwright-cli 根目录
- Playwright 执行建议：优先使用 scripts/run-playwright-advanced-acceptance.sh（内置低 token 输出策略）

当修改稀客算法或相关数据后，额外执行：

- pnpm dlx tsx scripts/verify-rare-ingredient-availability.ts

## 4. 关键风险点

- 三态过滤固定为 all | rare | disabled，缺失条目按 disabled 处理。
- 稀客料理过滤采用双模式：默认“隐藏非极佳”，可切换为“隐藏低于 X 分以下料理”（0-3）。
- 切换稀客筛选模式时，UI 必须弹出两种模式差异说明，避免误解筛选结果。
- 配置导出当前版本为 v6：`hm`（rareRecipeFilterMode）+ `hs`（rareHideBelowScore）；导入需兼容 legacy v5/v4 字段（`hs` / `hn`）。
- 不在组件内硬编码平衡数值，优先更新 src/data 并通过类型化逻辑消费。
- 存档与配置导入非法输入会抛错，UI 必须展示明确错误，禁止静默失败。

## 5. 文档索引

- 仓库运行记忆：docs/repo-memory.md
- 料理机制知识库：docs/tmi-cooking-mechanics-knowledge-base.md
- 用户流程与功能总览：README.md
