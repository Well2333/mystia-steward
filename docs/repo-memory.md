# Repo Memory

## 文档职责索引

- 工程约定与开发流程：docs/development-conventions.md
- 料理机制规则知识库：docs/tmi-cooking-mechanics-knowledge-base.md
- 本文档（repo-memory）用于记录仓库级运行事实与近期决策摘要。

## 开发环境

- 包管理器：pnpm
- 安装：pnpm install
- 开发启动：pnpm dev --host 0.0.0.0 或 pnpm dev
- 构建检查：pnpm build
- 2026-04-07 已验证：build 可通过，dev server 默认端口 5173

## 稀客食材可用性约束

- 稀客推荐在基础食材和加料两个层面都必须只使用已拥有食材。
- 已实现防线：
  - getRareIngredientIds 会将 ingredient filter 与 ownedIngredientIds 取交集。
  - rankRecipesForRare 的基础食材检查要求每个基础食材 id 在 availableIngredientIds 中，且不在 disabledIngredientIds 中。
  - setIngredientsBelowQty 会强制将未拥有食材设为 disabled。
- 校验脚本：pnpm dlx tsx scripts/verify-rare-ingredient-availability.ts
- 校验范围：全部稀客 x 点单料理 Tag x 点单酒水 Tag，以及排除玉米与棉花糖的琪露诺定向场景。

## 稀客酒水排序

- 2026-04-11 规则：先按是否满足点单分组（满足在前），再在各分组内按价格排序（升序/降序由 rareBeveragePriceSort 控制），同价保持原始顺序稳定。

## 项目守则补充

- 2026-04-13：仓库长期记忆、项目状态与全局知识统一沉淀在 docs 目录；禁止在仓库外部或其他目录保存仓库级长期记忆。
- 2026-04-13：Playwright 验收为高级验收，仅在用户主动提及时执行；验收流程需覆盖示例存档导入、普客/稀客随机浏览、设置开关稳定性，以及桌面与移动分辨率检查。
- 2026-04-13（实验复盘）：Playwright 流程需显式处理“使用指南/利润说明”弹窗拦截；设置页开关覆盖应按“当前可见开关”统计而非固定 3 次；移动端需包含最小交互抽查，不应只做静态截图。
- 2026-04-13：Playwright 高级验收新增低 token 执行入口 `scripts/run-playwright-advanced-acceptance.sh`，产物统一落在 `.playwright-cli/tmp/YYYY-MM-DD_HH:MM/`，避免污染 `.playwright-cli` 根目录。
- 2026-04-13：Playwright 执行函数模板固定在 `.playwright-cli/playwright-advanced-acceptance.fn.template.js`；每次运行按时间目录生成执行副本，且会自动回收根目录自动生成的 `page-*.yml` 与 `console-*.log`。
- 2026-04-13：稀客料理筛选升级为双模式：默认“隐藏非极佳”，可切换到“隐藏低于 X 分以下料理”（0-3）；切换时弹差异说明；配置导出升级至 v6（`hm` + `hs`），兼容 v5/v4 导入。
