# 2026-04-23 上游同步记录

## 基线

- 上游仓库：AnYiEE/touhou-mystia-izakaya-assistant
- 分支：master
- 基线 SHA：16024b275565291eae6f3af66538e1dcefc7943d

## 同步文件

- src/data/recipes.json
- src/data/customer_normal.json
- src/data/customer_rare.json
- public/assets/sprites/customer_rare.png

## 关键变化

- customer_rare 新增稀客：id=41（秦心）
- recipes 更新部分文案/来源字段，并修复 id=11007 名称前导空格
- customer_normal 修正河童聊天文案中的“菜谱”表述
- customer_rare 修正因幡帝、雪、舞的可出现地区
- 稀客页补充推测提示（仅在上方信息区展示，点单选择区不展示）

## 验证结果

- pnpm lint：通过
- pnpm build：通过
- pnpm dlx tsx scripts/verify-rare-ingredient-availability.ts：通过
- 高级验收：已执行（首次产物目录 .playwright-cli/tmp/2026-04-23_15:14）
- 高级验收复跑：通过（产物目录 .playwright-cli/tmp/2026-04-23_15:41）
	- importedSampleSave=true
	- desktopReadyState=complete
	- mobileReadyState=complete
	- console/network 无阻断错误
	- 唯一提示仍为“设置页可见开关不足3个，实际仅2个”（非阻断）

## 备注

- 本文件为时效记录，不作为长期规则文档。
- 后续若再次同步，请按 docs/upstream-sync-playbook.md 流程执行并新增当次记录。