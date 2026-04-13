---
name: playwright-web-smoke
description: 'Use Playwright CLI for advanced web acceptance only when explicitly requested by the user. Trigger words: playwright-cli, smoke test, 高级验收, UI回归, 网页可用性, 浏览项目网页.'
argument-hint: 'URL (default http://127.0.0.1:4173) and optional target page path'
user-invocable: true
disable-model-invocation: true
---

# Playwright Web Smoke

## 作用

在用户明确提出“执行 Playwright 验收”时，用 Playwright CLI 执行高级网页验收，覆盖导入存档、关键页面随机浏览、交互开关与响应式分辨率检查。

## 何时使用

- 用户主动要求执行 Playwright 验收时。
- 需要对“导入存档 + 普客/稀客核心流程 + 设置开关 + 响应式布局”做完整回归时。
- 需要产出快照与截图作为高级验收证据时。

## 前置条件

1. 启动本地开发服务（建议固定端口，便于自动化）。
2. 使用 Playwright CLI：
   - 优先全局命令 `playwright-cli`
   - 否则使用 `npx @playwright/cli@latest`
3. 示例存档存在：`.playwright-cli/Mystia#6.memory`。
4. 验收需覆盖两组分辨率：
   - 横屏：`1920 x 1080`
   - 竖屏：`720 x 1600`
5. 临时产物统一落在：`.playwright-cli/tmp/YYYY-MM-DD_HH:MM/`，不要写入 `.playwright-cli` 根目录。

## 低 Token 执行入口（推荐）

优先使用一键脚本：

- `bash scripts/run-playwright-advanced-acceptance.sh`

脚本会自动：

- 创建运行目录：`.playwright-cli/tmp/YYYY-MM-DD_HH:MM/`
- 从 `.playwright-cli/playwright-advanced-acceptance.fn.template.js` 复制执行副本到运行目录
- 用 `--raw` 运行 `run-code`，减少终端与对话输出
- 将 summary、console、network、截图统一写入该目录

## 标准流程（高级验收）

1. 启动会话并检查页面可加载
   - `playwright-cli close-all`
   - `playwright-cli open http://127.0.0.1:4173`
   - `playwright-cli eval "document.readyState"`
   - 记录本轮随机样本（普客3地区、稀客地区与3名稀客）到验收结论，保证可追溯。
2. 弹窗治理（每个关键点击前后都执行）
   - 如出现“使用指南”或“利润计算说明”弹窗，先关闭再继续。
   - 若弹窗导致点击拦截，优先点“我知道了”或“关闭指南”，必要时按 `Escape`。
3. 分辨率 A（1920x1080）执行完整流程
   - `playwright-cli resize 1920 1080`
   - 如存在使用指南弹窗，先关闭再截图（除非本次正在验证指南改动）
   - `playwright-cli snapshot --depth=4 --filename=.playwright-cli/desktop-home.yaml`
   - `playwright-cli screenshot --filename=.playwright-cli/desktop-home.png`
4. 在设置页导入示例存档
   - `playwright-cli goto http://127.0.0.1:4173/settings`
   - 点击“选择存档文件”后执行：`playwright-cli upload .playwright-cli/Mystia#6.memory`
   - 校验导入成功文案（例如“导入成功”）是否出现。
   - 记录导入后页面状态快照：
   - `playwright-cli snapshot --depth=4 --filename=.playwright-cli/desktop-settings-after-import.yaml`
5. 普客页随机浏览 3 个地区
   - `playwright-cli goto http://127.0.0.1:4173/normal`
   - 从地区选择器随机切换 3 个不重复地区，每次切换后确认页面渲染正常且无报错
   - 保存至少一张普客页截图：`playwright-cli screenshot --filename=.playwright-cli/desktop-normal-random.png`
6. 稀客页随机浏览
   - `playwright-cli goto http://127.0.0.1:4173/rare`
   - 随机选择 1 个地区，并在该地区随机选择任意 3 个稀客
   - 对每个稀客随机切换点单料理/酒水词条，确认页面渲染与推荐结果区域无异常
   - 保存至少一张稀客页截图：`playwright-cli screenshot --filename=.playwright-cli/desktop-rare-random.png`
7. 设置页开关稳定性
   - `playwright-cli goto http://127.0.0.1:4173/settings`
   - 遍历并切换“设置页当前可见的全部开关”至少一次，记录开关数量与切换次数
   - 若本页可见开关少于 3，不判失败，但需在结论里标注覆盖限制
   - 保存截图：`playwright-cli screenshot --filename=.playwright-cli/desktop-settings-toggle.png`
8. 分辨率 B（720x1600）抽样复验
   - `playwright-cli resize 720 1600`
   - 重复首页、普客页、稀客页、设置页的快速浏览与截图
   - 额外执行最小交互抽查：
   - 普客页至少切换 1 个地区
   - 稀客页至少切换 1 名稀客的 1 组词条
   - 截图建议：
   - `playwright-cli screenshot --filename=.playwright-cli/mobile-home.png`
   - `playwright-cli screenshot --filename=.playwright-cli/mobile-normal.png`
   - `playwright-cli screenshot --filename=.playwright-cli/mobile-rare.png`
   - `playwright-cli screenshot --filename=.playwright-cli/mobile-settings.png`
9. 结束并汇总
   - `playwright-cli console`（保存为日志文件）
   - `playwright-cli network`（保存为日志文件）
   - 若关键步骤失败，允许对该步骤重试 1 次并记录“重试后结果”
   - `playwright-cli close`

## 输出目录约束

- 允许写入：`.playwright-cli/tmp/YYYY-MM-DD_HH:MM/`
- 禁止写入：`.playwright-cli` 根目录（仅 `Mystia#6.memory` 可保留在根目录）
- 验收脚本临时文件（如 run-code 函数文件）也应放在对应时间目录内

## 浏览器缺失时的处理

如果出现 `Chromium distribution 'chrome' is not found`：

1. 先安装浏览器：
   - `npx -y @playwright/cli@latest install-browser chrome`
2. 如果当前环境受限无法完成下载，执行临时回退：
   - 用浏览器工具打开 `http://127.0.0.1:4173` 与关键页面（如 `/settings`）
   - 配合 `curl` 验证首页返回 200
3. 在验收结论中明确标注“已执行回退检查，待浏览器安装完成后补跑 Playwright CLI 全流程”。

## 验收标准

- 页面可成功打开，且 `document.readyState` 为 `complete`。
- 示例存档 `.playwright-cli/Mystia#6.memory` 可成功导入。
- 普客页随机 3 地区浏览正常。
- 稀客页随机 1 地区下的任意 3 名稀客，随机切换词条后仍正常。
- 设置页可见开关切换不报错，且覆盖数有记录。
- 快照与截图生成成功，且截图前已关闭使用指南（非指南改动场景）。
- 桌面与移动分辨率均完成检查。
- 移动端包含至少一次交互抽查，不仅是静态截图。
- 控制台无阻断级报错（例如运行时崩溃、关键资源加载失败）。

详细清单见 [smoke-checklist.md](./references/smoke-checklist.md)。
