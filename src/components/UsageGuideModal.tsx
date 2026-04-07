import { useEffect, useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Crown, Save, Settings2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface UsageGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoOpenDisabled: boolean;
  onAutoOpenDisabledChange: (disabled: boolean) => void;
}

interface GuideSection {
  title: string;
  summary: string;
  icon: LucideIcon;
  steps: string[];
}

const quickStartSteps = [
  '先到设置页导入 Mystia#x.memory，系统会自动同步已取得的菜谱、酒水和食材。',
  '按你的经营策略调整可用范围：常用内容保留“全可用”，高成本内容可改为“仅稀客”，不想出现的设为“禁用”。',
  '去普客页按地区看日常推荐，需要利润就切到利润优先，需要覆盖就切到覆盖优先。',
  '遇到稀客时切到稀客页，选中对应客人和点单 Tag，优先看“极佳”结果。',
];

const guideSections: GuideSection[] = [
  {
    title: '设置页：先把基础数据整理好',
    summary: '这里决定后续所有推荐能不能算准，第一次使用建议先完整过一遍。',
    icon: Settings2,
    steps: [
      '导入存档：点击“选择存档文件”或直接拖拽 .memory 文件，导入后已取得状态会自动写入。',
      '调整取得状态：如果游戏内数据和导入结果有差异，打开“调整取得状态”后逐项修正。',
      '配置过滤策略：菜谱、酒水、食材都支持“全可用 / 仅稀客 / 禁用”三态。',
      '食材批量处理：可以按“低于 X 个食材”批量修改可用范围，适合处理库存紧张的原料。',
      '流行标签设置：根据当前流行和厌恶标签录入偏好，推荐结果会一起考虑。',
    ],
  },
  {
    title: '普客页：日常跑店优先看这里',
    summary: '普客推荐按地区展示，适合快速决定这一桌先上什么。',
    icon: Users,
    steps: [
      '先选择地区，列表会切到该地区当前可服务的普客需求。',
      '在“菜谱 / 酒水”标签间切换，分别查看料理和酒水推荐。',
      '菜谱排序可在“覆盖优先”和“利润优先”之间切换，按当前目标决定。',
      '酒水排序可在“匹配优先”和“高价优先”之间切换。',
      '页面侧边栏会汇总当前地区普客标签，方便你判断整体需求方向。',
    ],
  },
  {
    title: '稀客页：按点单标签锁定极佳',
    summary: '这里是稀客专项工具，核心目标是尽快找到“极佳优先”的料理和酒水。',
    icon: Crown,
    steps: [
      '先选地区，再点击目标稀客头像，可在同地区客人之间快速切换。',
      '如果列表太长，可以隐藏未遇到的稀客，只保留已解锁对象。',
      '按点单内容分别选择“点单料理 Tag”和“点单酒水 Tag”，页面会记住你的选择。',
      '料理结果默认开启“隐藏非极佳”，让你优先看到最优组合。',
      '悬浮查看菜谱时，可以看到匹配到的正面 Tag、负面 Tag、基础原料和可追加配料。',
      '酒水结果会按“先满足点单，再按价格降序”排列。',
    ],
  },
  {
    title: '配置导入导出：跨设备沿用同一套策略',
    summary: '当你在不同设备游玩，或者想备份一份当前配置时，用这里最省事。',
    icon: Save,
    steps: [
      '设置页支持导出到剪贴板，也支持导出成配置文件。',
      '导入时可以直接粘贴压缩字符串，也可以选择之前导出的文件。',
      '导入导出会保留过滤规则、流行偏好、稀客隐藏列表和已选点单 Tag 等页面偏好。',
    ],
  },
];

export function UsageGuideModal({
  open,
  onOpenChange,
  autoOpenDisabled,
  onAutoOpenDisabledChange,
}: UsageGuideModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const checkboxId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="关闭使用指南"
        className="absolute inset-0 bg-foreground/35 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative z-10 flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="flex w-full max-w-5xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_24px_80px_rgba(61,46,31,0.18)] sm:max-h-[calc(100dvh-3rem)]"
        >
          <div className="relative shrink-0 overflow-hidden border-b border-border/80 bg-[radial-gradient(circle_at_top_left,_rgba(212,163,115,0.28),_transparent_42%),linear-gradient(135deg,_rgba(255,249,240,0.98),_rgba(251,244,232,0.92))] px-5 py-5 sm:px-8 sm:py-6">
            <div className="absolute -right-16 top-0 h-32 w-32 rounded-full bg-primary/12 blur-3xl" />
            <div className="absolute bottom-0 left-12 h-16 w-16 rounded-full bg-secondary/80 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <h2 id={titleId} className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    夜雀掌柜使用指南
                  </h2>
                  <p id={descriptionId} className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                    第一次使用时，按下面的顺序操作会最快进入可用状态。
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="关闭使用指南"
                className="shrink-0 rounded-full"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickStartSteps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm backdrop-blur-sm"
                >
                  <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background/65">
            <div className="space-y-4 px-5 py-5 sm:px-8 sm:py-6">
              {guideSections.map(({ title, summary, icon: Icon, steps }) => (
                <Card key={title} className="border border-border/80 bg-background/70 shadow-none">
                  <CardHeader className="gap-2 border-b border-border/70 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
                        <CardDescription className="leading-6">{summary}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <ol className="space-y-2 text-sm leading-6 text-foreground">
                      {steps.map((step, index) => (
                        <li key={step} className="flex gap-3">
                          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-3 border-t border-border/80 bg-card px-5 py-4 shadow-[0_-12px_24px_rgba(61,46,31,0.06)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Label htmlFor={checkboxId} className="w-fit cursor-pointer items-start gap-3 leading-6 text-foreground">
              <Checkbox
                id={checkboxId}
                checked={autoOpenDisabled}
                onCheckedChange={(checked) => onAutoOpenDisabledChange(checked === true)}
                aria-label="不再自动显示"
                className="mt-1"
              />
              <span>
                <span className="block font-medium">不再自动显示</span>
                <span className="block text-sm text-muted-foreground">
                  勾选后，下次打开网站不再自动弹出；你仍然可以通过顶部“使用指南”按钮手动打开。
                </span>
              </span>
            </Label>

            <div className="flex items-center justify-end gap-2">
              <Button onClick={() => onOpenChange(false)}>知道了</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}