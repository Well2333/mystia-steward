import { useEffect, useId, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, Crown, Save, Settings2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  highlights?: string[];
  steps: string[];
}

const guidePages: GuideSection[] = [
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
      '悬浮查看菜谱时，可以看到命中喜好 Tag、命中厌恶 Tag、基础原料和可追加配料。',
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
  const [pageIndex, setPageIndex] = useState(0);

  const currentPage = guidePages[pageIndex];
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex === guidePages.length - 1;
  const progressText = useMemo(() => `第 ${pageIndex + 1} / ${guidePages.length} 页`, [pageIndex]);

  const closeModal = () => {
    setPageIndex(0);
    onOpenChange(false);
  };

  const goPrevPage = () => {
    setPageIndex((prev) => Math.max(0, prev - 1));
  };

  const goNextPage = () => {
    if (isLastPage) {
      closeModal();
      return;
    }
    setPageIndex((prev) => Math.min(guidePages.length - 1, prev + 1));
  };

  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPageIndex(0);
        onOpenChange(false);
        return;
      }
      if (event.key === 'ArrowLeft') {
        setPageIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (event.key === 'ArrowRight') {
        if (pageIndex >= guidePages.length - 1) {
          setPageIndex(0);
          onOpenChange(false);
          return;
        }
        setPageIndex((prev) => Math.min(guidePages.length - 1, prev + 1));
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange, pageIndex]);

  if (!open) return null;

  const PageIcon = currentPage.icon;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="关闭使用指南"
        className="absolute inset-0 bg-foreground/35 backdrop-blur-sm"
        onClick={closeModal}
      />

      <div className="relative z-10 flex min-h-full items-center justify-center p-3 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="flex h-[min(92dvh,780px)] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_24px_80px_rgba(61,46,31,0.18)]"
        >
          <div className="relative shrink-0 overflow-hidden border-b border-border/80 bg-[radial-gradient(circle_at_top_left,_rgba(212,163,115,0.28),_transparent_42%),linear-gradient(135deg,_rgba(255,249,240,0.98),_rgba(251,244,232,0.92))] px-4 py-4 sm:px-6 sm:py-5">
            <div className="absolute -right-16 top-0 h-32 w-32 rounded-full bg-primary/12 blur-3xl" />
            <div className="absolute bottom-0 left-12 h-16 w-16 rounded-full bg-secondary/80 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <h2 id={titleId} className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem]">
                    夜雀掌柜使用指南
                  </h2>
                  <p id={descriptionId} className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                    按模块逐页查看常用功能与操作步骤。
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="关闭使用指南"
                className="shrink-0 rounded-full"
                onClick={closeModal}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background/65 px-4 py-4 sm:px-6 sm:py-5">
            <section className="rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <PageIcon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold sm:text-lg">{currentPage.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{currentPage.summary}</p>
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  {progressText}
                </span>
              </div>

              {currentPage.highlights && currentPage.highlights.length > 0 && (
                <div className="mb-3 rounded-xl border border-primary/20 bg-primary/8 px-3 py-2 text-xs leading-5 text-foreground">
                  {currentPage.highlights.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}

              <ol className="space-y-2 text-sm leading-6 text-foreground">
                {currentPage.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 rounded-xl border border-border/60 bg-card/65 px-3 py-2.5">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-card px-4 py-4 shadow-[0_-12px_24px_rgba(61,46,31,0.06)] sm:px-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={goPrevPage} disabled={isFirstPage}>
                <ChevronLeft className="size-4" />
                上一页
              </Button>
              <div className="flex items-center gap-1.5">
                {guidePages.map((page) => {
                  const pagePos = guidePages.indexOf(page);
                  const isActive = pagePos === pageIndex;
                  return (
                    <span
                      key={page.title}
                      className={`h-2 w-2 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-border'}`}
                    />
                  );
                })}
              </div>
              <Button size="sm" onClick={goNextPage}>
                {isLastPage ? '完成' : '下一页'}
                {!isLastPage && <ChevronRight className="size-4" />}
              </Button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <Button onClick={closeModal}>关闭指南</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}