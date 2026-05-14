import { useEffect, useMemo, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useLocation, useNavigate } from 'react-router';
import { GUIDE_VERSION, useGameStore } from '@/stores/game-store';

type GuideMode = 'auto' | 'manual';
export const APP_GUIDE_OPEN_EVENT = 'mystia-steward-open-guide';
const GUIDE_AUTO_SELECTED_PLACE = '妖怪兽道';

interface AppGuideProps {
  suppressAutoStart: boolean;
}

interface GuideStep {
  key: string;
  title: string;
  descriptionLines: string[];
  route?: '/settings' | '/normal' | '/rare';
  selectors?: string[];
  nextLabel?: string;
  popoverSide?: 'left' | 'right' | 'top' | 'bottom' | 'over';
  popoverAlign?: 'start' | 'center' | 'end';
}

interface GuideSession {
  mode: GuideMode;
  stepIndex: number;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildGuideHtml(stepIndex: number, totalSteps: number, lines: string[]) {
  const body = lines
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');

  return [
    '<div class="mystia-guide-copy">',
    `<p class="mystia-guide-progress">第 ${stepIndex + 1} / ${totalSteps} 步</p>`,
    body,
    '</div>',
  ].join('');
}

function queryFirst(selectors: string[] | undefined) {
  if (!selectors) return undefined;
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return undefined;
}

export function AppGuide({ suppressAutoStart }: AppGuideProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const guideCompletedVersion = useGameStore((state) => state.guideCompletedVersion);
  const guideSkipUnlocked = useGameStore((state) => state.guideSkipUnlocked);
  const guideDataSource = useGameStore((state) => state.guideDataSource);
  const normalSelectedPlace = useGameStore((state) => state.normalSelectedPlace);
  const rareSelectedPlace = useGameStore((state) => state.rareSelectedPlace);
  const completeGuide = useGameStore((state) => state.completeGuide);
  const applyTemporaryGuideData = useGameStore((state) => state.applyTemporaryGuideData);
  const setNormalSelectedPlace = useGameStore((state) => state.setNormalSelectedPlace);
  const setRareSelectedPlace = useGameStore((state) => state.setRareSelectedPlace);

  const [session, setSession] = useState<GuideSession | null>(null);

  const steps = useMemo<GuideStep[]>(() => [
    {
      key: 'intro',
      title: '交互式新手引导',
      descriptionLines: [
        '接下来会按“设置 → 普客 → 稀客”带你走一遍核心流程。',
        '首次自动弹出时需要完整看完；手动从顶部打开，或导入过配置后，则可以随时跳过。',
      ],
      nextLabel: '开始引导',
    },
    {
      key: 'nav-settings',
      title: '先进入设置页',
      descriptionLines: [
        '推荐结果依赖你的存档、配置和手动过滤设置。',
        '先把基础数据整理好，后面的页面才会算得准。',
      ],
      selectors: ['[data-guide="nav-settings"]'],
      nextLabel: '前往设置页',
    },
    {
      key: 'settings-save-import',
      title: '优先导入本地存档',
      descriptionLines: [
        '如果这台电脑上有 Mystia#.memory 存档，用这里最快。',
        '导入后，已取得的料理、酒水和食材会自动写入；离开设置页前，存档或配置至少要完成一种导入。',
      ],
      route: '/settings',
      selectors: ['[data-guide="settings-save-import"]'],
    },
    {
      key: 'settings-config-import',
      title: '没有本地存档时，改用跨设备配置',
      descriptionLines: [
        '如果当前设备没有存档，可以从有存档的设备上打开夜雀掌柜后导入，',
        '然后将配置信息通过文件或字符串导出到这里。',
      ],
      route: '/settings',
      selectors: ['[data-guide="settings-config-import"]'],
    },
    {
      key: 'settings-manual-ownership',
      title: '这里优先用于修正解析结果',
      descriptionLines: [
        '这里主要用来修正自动导入后的遗漏、误判和库存偏差，不是第一选择。',
        '如果实在拿不到存档或配置，再把它当成补救方案，手动补齐已取得的料理、酒水和食材。',
      ],
      route: '/settings',
      selectors: ['[data-guide="settings-ownership"]'],
    },
    {
      key: 'settings-trend',
      title: '补录流行标签',
      descriptionLines: [
        '这里可以设置当晚的流行喜爱和流行厌恶标签；导入存档时也会尝试解析这些状态。',
        '但夜雀食堂的存档机制有时会让“明星店”效果识别不准，你需要手动确认它当前是否真的生效，或者其实已经过期。',
        '在进入普客页前，你必须先导入存档或配置；如果实在导不进来，下面会提供临时假存档继续演示。',
      ],
      route: '/settings',
      selectors: ['[data-guide="settings-trend"]'],
      nextLabel: '前往普客页',
    },
    {
      key: 'normal-region',
      title: '普客页先看一个示例地区',
      descriptionLines: [
        '这里已经替你切到“妖怪兽道”，方便直接继续看后面的推荐结果。',
        '之后你自己使用时，可以再切到其他地区，右侧普客列表和左侧推荐都会一起更新。',
      ],
      route: '/normal',
      selectors: ['[data-guide="normal-region-selector"]'],
    },
    {
      key: 'normal-results',
      title: '这里看普客推荐',
      descriptionLines: [
        '有结果时，优先用这里切料理 / 酒水和排序方式。',
        '如果当前还是空白，通常是地区未选、数据未导入，或者项目已被过滤掉。',
      ],
      route: '/normal',
      selectors: [
        '[data-guide="normal-results-shell"]',
        '[data-guide="normal-empty-state"]',
        '[data-guide="normal-region-selector"]',
      ],
      nextLabel: '前往稀客页',
    },
    {
      key: 'rare-region',
      title: '稀客页也先看一个示例地区',
      descriptionLines: [
        '这里同样已经替你切到“妖怪兽道”，接下来直接从下方头像里选择目标稀客。',
        '如果名单过长，还可以用“过滤稀客”只保留想看的对象。',
      ],
      route: '/rare',
      selectors: ['[data-guide="rare-region-selector"]'],
    },
    {
      key: 'rare-customers',
      title: '在这里选目标稀客',
      descriptionLines: [
        '先点一个稀客头像，页面才会展开她的点单配置。',
        '头像右上角的小绿点表示你之前已经为她选过点单 Tag。',
      ],
      route: '/rare',
      selectors: ['[data-guide="rare-customer-strip"]'],
    },
    {
      key: 'rare-order-tags',
      title: '补齐点单料理和酒水 Tag',
      descriptionLines: [
        '选中稀客后，这里会出现“点单料理 Tag”和“点单酒水 Tag”。',
        '这两个条件补齐后，下方才会开始给出稀客料理和酒水推荐。',
      ],
      route: '/rare',
      selectors: ['[data-guide="rare-order-tags-controls"]', '[data-guide="rare-order-tags"]', '[data-guide="rare-order-placeholder"]'],
      popoverSide: 'top',
      popoverAlign: 'start',
    },
    {
      key: 'rare-results',
      title: '这里看稀客结果',
      descriptionLines: [
        '有结果时，可以继续用筛选、最多加料和价格排序压缩备选。',
        '如果这里没有结果，优先回设置页确认取得状态、库存和过滤规则。',
      ],
      route: '/rare',
      selectors: [
        '[data-guide="rare-results-shell"]',
        '[data-guide="rare-empty-state"]',
        '[data-guide="rare-order-tags"]',
        '[data-guide="rare-order-placeholder"]',
      ],
    },
    {
      key: 'finish',
      title: '教程入口就在这里',
      descriptionLines: [
        '以后你可以随时通过顶部“使用指南”重新打开这套交互式教程。',
        '本轮引导完成后，首次强制阅读状态也会一并解除。',
      ],
      selectors: ['[data-guide="nav-guide-button"]'],
      nextLabel: '完成',
    },
  ], []);

  const isGuideCompleted = guideCompletedVersion >= GUIDE_VERSION;
  const isGuideDataReady = guideDataSource !== 'none';
  const canSkip = session?.mode === 'manual' || guideSkipUnlocked;

  useEffect(() => {
    const handleOpen = () => {
      setSession({ mode: 'manual', stepIndex: 0 });
    };

    window.addEventListener(APP_GUIDE_OPEN_EVENT, handleOpen);
    return () => {
      window.removeEventListener(APP_GUIDE_OPEN_EVENT, handleOpen);
    };
  }, []);

  useEffect(() => {
    if (suppressAutoStart || isGuideCompleted || session !== null) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSession({ mode: 'auto', stepIndex: 0 });
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isGuideCompleted, session, suppressAutoStart]);

  useEffect(() => {
    if (!session) return undefined;

    const currentStep = steps[session.stepIndex];
    if (!currentStep) return undefined;

    if (currentStep.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
      return undefined;
    }

    if (currentStep.key === 'normal-region' && normalSelectedPlace !== GUIDE_AUTO_SELECTED_PLACE) {
      setNormalSelectedPlace(GUIDE_AUTO_SELECTED_PLACE);
      return undefined;
    }

    if (currentStep.key === 'rare-region' && rareSelectedPlace !== GUIDE_AUTO_SELECTED_PLACE) {
      setRareSelectedPlace(GUIDE_AUTO_SELECTED_PLACE);
      return undefined;
    }

    const currentDriver = driver({
      allowClose: false,
      allowKeyboardControl: false,
      animate: true,
      overlayColor: 'rgba(61, 46, 31, 0.72)',
      overlayOpacity: 0.72,
      popoverClass: 'mystia-guide-popover',
      showButtons: [],
      smoothScroll: true,
      stagePadding: 10,
      stageRadius: 18,
    });

    const finishGuide = () => {
      completeGuide();
      setSession(null);
    };

    const goToStep = (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= steps.length) {
        return;
      }
      setSession((prev) => (prev ? { ...prev, stepIndex: nextIndex } : prev));
    };

    const requiresImportedData = currentStep.key === 'settings-trend' && !isGuideDataReady;
  const nextDisabled = requiresImportedData;

    const makeButton = (label: string, className: string, onClick: () => void, disabled = false) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.className = className;
      button.disabled = disabled;
      button.addEventListener('click', onClick);
      return button;
    };

    currentDriver.highlight({
      element: queryFirst(currentStep.selectors),
      popover: {
        align: currentStep.popoverAlign ?? 'center',
        side: currentStep.popoverSide,
        description: buildGuideHtml(session.stepIndex, steps.length, currentStep.descriptionLines),
        onPopoverRender: (popover) => {
          document.querySelectorAll('.driver-overlay').forEach((node) => {
            if (node instanceof SVGElement) {
              node.style.pointerEvents = 'none';
            }
          });

          if (popover.footer instanceof HTMLElement) {
            popover.footer.style.display = 'block';
          }

          popover.footerButtons.innerHTML = '';

          if (session.stepIndex > 0) {
            const prevButton = makeButton('上一步', 'mystia-guide-button mystia-guide-button-secondary', () => {
              goToStep(session.stepIndex - 1);
            });
            popover.footerButtons.append(prevButton);
          }

          if (currentStep.key === 'settings-trend' && !isGuideDataReady) {
            const tempButton = makeButton('导入临时假存档', 'mystia-guide-button mystia-guide-button-secondary', () => {
              applyTemporaryGuideData();
            });
            popover.footerButtons.append(tempButton);
          }

          if (canSkip) {
            const skipButton = makeButton('跳过', 'mystia-guide-button mystia-guide-button-ghost', finishGuide);
            popover.footerButtons.append(skipButton);
          }

          const isLastStep = session.stepIndex === steps.length - 1;
          const nextLabel = isLastStep
            ? '完成'
            : requiresImportedData
              ? '请先导入存档或配置'
              : (currentStep.nextLabel ?? '下一步');
          const nextButton = makeButton(nextLabel, 'mystia-guide-button mystia-guide-button-primary', () => {
            if (isLastStep) {
              finishGuide();
              return;
            }
            goToStep(session.stepIndex + 1);
          }, nextDisabled);
          popover.footerButtons.append(nextButton);
        },
        showButtons: [],
        title: currentStep.title,
      },
    });

    return () => {
      currentDriver.destroy();
    };
  }, [
    applyTemporaryGuideData,
    canSkip,
    completeGuide,
    isGuideDataReady,
    location.pathname,
    navigate,
    normalSelectedPlace,
    rareSelectedPlace,
    setNormalSelectedPlace,
    setRareSelectedPlace,
    session,
    steps,
  ]);

  return null;
}