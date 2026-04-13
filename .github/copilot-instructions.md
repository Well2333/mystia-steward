# Project Guidelines

> **理解确认：** 请在回复时简要回答“已加载核心运行协议”，确保你阅读、理解并遵守了本文件所述的行为准则。

## Basic Principles
- **长期记忆强制限制**：任何关于仓库的长期记忆、项目状态或全局知识，**必须**统一集中保存在项目内的 `docs` 文件夹下，**绝对禁止**将其存放在仓库外部或非指定目录中。
- **上下文与记忆强制锚定**：无论做出任何修改前，都要首先阅读并严格遵守本文件及 `docs` 目录下的文档中定义的约定（conventions）与原则（principles）。完成核心功能修改后，必须主动提示用户是否需要更新相关文档，以保持项目状态的持久化。
- **文档同步强制更新**：当代码修改、架构调整或业务逻辑的变动，使现有的知识库、准则文档或注释过时，**必须同步更新**这些相关文档，确保项目代码与文档资料的绝对一致性，绝不留下认知债务。
- **用户侧内容洁癖**：任何面向用户侧的说明、注释和文档，必须清晰、专业、易读。**绝对禁止**将你的内部思考过程、系统提示词、修改建议或生硬的机器口吻直接作为内容写入其中（除非明确要求）。
- **零遗漏执行**：严格执行指令中的**所有**约束条件。在回复或交付前，必须自行核对是否遗漏了任何微小的需求。遇到模糊的依赖或不确定的技术细节，必须**立即提问**，禁止自行脑补或进行未经验证的假设。
- **拒绝占位符与半成品**：交付的代码必须是完整且可直接运行的。**严禁**输出 `// TODO`、`// ...existing code...` 或 `...（此处省略代码）` 等敷衍性占位符（除非明确要求）。
- **无损修改原则**：只在必要的地方进行精确修改。绝对不允许随意更改、删除或重构与当前任务无关的代码逻辑。

## Code Style
- 使用 TypeScript 严格模式（strict mode）对应的写法；除非没有现实可行方案，否则不要引入 `any`。
- 优先使用函数组件（function components）与 hooks。业务逻辑放在 `src/lib` 或 `src/stores`，不要堆在 JSX 密集组件里。
- `src` 下的模块统一使用 `@/` 路径别名（import alias）。
- 新增组件前先复用 `src/components/ui` 中已有基础组件（UI primitives）和现有业务组件。
- 注释保持简短且有信息量。面向用户的文案（除特殊要求的情况下）默认使用中文。

## Architecture
- 项目为 JSON 驱动（JSON-driven）：料理、酒水、食材、顾客等数据以 `src/data/*.json` 为唯一事实来源（source of truth）。
- 全局状态与用户配置持久化（persisted state）统一在 `src/stores/game-store.ts`。
- 推荐算法边界（recommendation boundaries）：
  - 普客逻辑：`src/lib/normal-recommend.ts`
  - 稀客逻辑：`src/lib/rare-recommend.ts`
  - Tag 冲突与评分规则：`src/lib/tags.ts`
- 路由与页面顶层组合在 `src/App.tsx` 与 `src/pages/*`。
- 精灵图（sprite）渲染统一走 `src/components/Sprite.tsx` 与 `src/lib/sprite-index.ts`。
- 产品行为与用户流程细节遵循“Link, don’t embed”：引用 `README.md`，不要在此重复大段说明。

## Build And Validation
- 安装依赖：`pnpm install`
- 启动开发环境：`pnpm dev`
- 静态检查：`pnpm lint`
- 构建：`pnpm build`
- 预览构建产物：`pnpm preview`
- Playwright 高级验收：仅在用户主动提及时执行，按 `.github/skills/playwright-web-smoke/SKILL.md` 流程进行。
- 当前仓库暂无独立自动化测试命令（no dedicated test command）。
- 当修改稀客算法或相关数据后，执行原料可用性校验（sanity check）：
  - `pnpm dlx tsx scripts/verify-rare-ingredient-availability.ts`

## Conventions And Pitfalls
- 过滤状态为三态（tri-state）：`all | rare | disabled`。缺失条目默认按 `disabled` 处理。
- 不要在组件里硬编码数值平衡（balancing values）；应更新 `src/data` 结构化数据并通过类型化逻辑消费。
- Tag 本体是中性概念：喜好/厌恶来自顾客偏好关系，不要把 tag 本身实现成“正面/负面”两类。
- Tag 冲突、动态 Tag、评分必须复用 `src/lib/tags.ts`，不要在页面/组件局部重写一套。
- 稀客推荐当前采用默认酒水假设：酒水按“满足点单且+1分”处理，料理侧目标分封顶为 3 分；达到上限后不再为超分追加食材。
- 存档/配置导入在非法输入时会抛错（`src/lib/save-parser.ts`, `src/lib/config-io.ts`）；UI 必须展示明确错误，禁止静默失败。
- Vite 通过 `vite.config.ts` 注入 `__APP_COMMIT_HASH__`；除非明确调整版本展示策略，否则保留此行为。

## Key Reference Files
- `README.md`（功能总览与用户使用流程）
- `src/stores/game-store.ts`（持久化状态、过滤器、拥有状态与派生 getter）
- `src/lib/normal-recommend.ts`（普客评分逻辑）
- `src/lib/rare-recommend.ts`（稀客组合搜索逻辑）
- `src/lib/tags.ts`（Tag 冲突与评分规则）
- `src/pages/SettingsPage.tsx`（存档/配置导入导出与过滤管理）
