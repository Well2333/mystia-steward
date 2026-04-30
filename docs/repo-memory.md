# Repo Memory

## 文档职责索引

- 工程约定与开发流程：docs/development-conventions.md
- 料理机制规则知识库：docs/tmi-cooking-mechanics-knowledge-base.md
- Addressables 标签提取手册：docs/addressables-tag-mapping-playbook.md
- 上游同步操作手册（可复用流程）：docs/upstream-sync-playbook.md
- 更新记录目录（时效日志）：docs/updates/*.md
- 本文档（repo-memory）用于记录仓库级运行事实与近期决策摘要。

## 开发环境

- 包管理器：pnpm
- 安装：pnpm install
- 开发启动：pnpm dev --host 0.0.0.0 或 pnpm dev
- 构建检查：pnpm build

## 稀客食材可用性约束

- 稀客推荐在基础食材和加料两个层面都必须只使用已拥有食材。
- 已实现防线：
  - getRareIngredientIds 会将 ingredient filter 与 ownedIngredientIds 取交集。
  - rankRecipesForRare 的基础食材检查要求每个基础食材 id 在 availableIngredientIds 中，且不在 disabledIngredientIds 中。
  - setIngredientsBelowQty 会强制将未拥有食材设为 disabled。
- 不再维护独立的稀客食材可用性批量校验脚本；后续不再将其作为标准验证步骤。

## 稀客酒水排序

- 规则：先按是否满足点单分组（满足在前），再在各分组内按价格排序（升序/降序由 rareBeveragePriceSort 控制），同价保持原始顺序稳定。
