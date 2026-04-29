# 上游数据同步操作手册

本文档仅用于沉淀“从上游拉取、同步到本地、执行验证”的可复用流程。

## 适用范围

- 上游：AnYiEE/touhou-mystia-izakaya-assistant（默认分支 master）
- 本仓库同步域：
  - src/data/recipes.json
  - src/data/ingredients.json
  - src/data/beverages.json
  - src/data/customer_normal.json
  - src/data/customer_rare.json
  - public/assets/sprites/recipe.png
  - public/assets/sprites/ingredient.png
  - public/assets/sprites/beverage.png
  - public/assets/sprites/customer_normal.png
  - public/assets/sprites/customer_rare.png

## 标准流程

1. 锁定上游基线（必须记录 SHA）

```bash
git ls-remote https://github.com/AnYiEE/touhou-mystia-izakaya-assistant.git refs/heads/master
```

2. 拉取上游快照

```bash
git clone --depth 1 --branch master https://github.com/AnYiEE/touhou-mystia-izakaya-assistant.git /tmp/tmi-upstream
```

3. 生成上游标准 JSON 快照（建议用上游 tsx 直接导出）

- 从 app/data/*/data.ts 导出五类数据到 /tmp/tmi-upstream-json
- 快照需保持稳定格式（JSON.stringify + 2 空格 + 末尾换行）

4. 差异分析（先比对再替换）

- 文件级：count + hash
- ID 级：新增/删除/字段变化
- 顺序级：检查 id 序列是否一致（影响 sprite 索引）

5. 差异化同步

- 仅替换有差异的文件，避免噪声改动
- 若 customer_rare 顺序或条目变化，必须同步 customer_rare.png

6. 工程验证

```bash
pnpm lint
pnpm build
```

7. 浏览器高级验收

- 启动预览（固定端口 4173）

```bash
pnpm preview --host 127.0.0.1 --port 4173
```

- 执行高级验收脚本

```bash
bash scripts/run-playwright-advanced-acceptance.sh
```

- 检查产物目录：.playwright-cli/tmp/YYYY-MM-DD_HH:MM/

## 通过标准

- lint/build 通过
- 高级验收 summary 中无阻断错误
- 关键截图与 console/network 日志完整

## 常见风险

- 只更新数据不更新 sprite 导致图标错位
- 上游新增角色后 id 顺序变化未同步，导致 index 错配
