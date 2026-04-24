import { useState } from 'react';
import { useGameStore, type FilterState } from '@/stores/game-store';
import { exportConfig, importConfig, downloadConfigFile, readConfigFile } from '@/lib/config-io';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sprite } from '@/components/Sprite';

import allRecipes from '@/data/recipes.json';
import allBeverages from '@/data/beverages.json';
import allIngredients from '@/data/ingredients.json';
import type { IRecipe, IBeverage, IIngredient } from '@/lib/types';
import { recipeIndexMap, beverageIndexMap, ingredientIndexMap } from '@/lib/sprite-index';

type SpriteType = 'recipe' | 'beverage' | 'ingredient';
type IndexMap = Map<number, number>;

const ALL_FOOD_TAGS = [
  '肉', '水产', '素', '家常', '高级', '传说', '菌类',
  '咸', '鲜', '甜', '辣', '苦', '酸',
  '重油', '清淡', '下酒', '饱腹', '山珍', '海味',
  '和风', '西式', '中华',
  '力量涌现', '灼热', '凉爽', '猎奇', '文化底蕴', '不可思议',
  '小巧', '梦幻', '特产', '果味', '汤羹', '烧烤',
  '燃起来了', '毒', '适合拍照', '生',
];

const FILTER_LABELS: Record<FilterState, { text: string; color: string }> = {
  all:      { text: '全可用', color: 'bg-green-500 text-white' },
  rare:     { text: '仅稀客', color: 'bg-amber-500 text-white' },
  disabled: { text: '禁用',   color: 'bg-gray-300 text-gray-600' },
};

function getOS(): 'windows' | 'mac' | 'linux' {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'windows';
}

const SAVE_PATHS = {
  windows: '%APPDATA%\\..\\LocalLow\\Epicomic\\Touhou Mystia Izakaya\\Memory\\Save\\BetaV9\\',
  linux: '~/.config/unity3d/Epicomic/Touhou Mystia Izakaya/Memory/Save/',
  mac: '~/Library/Application Support/unity.Epicomic.TouhouMystiaIzakaya/Memory/Save/',
} as const;

export function SettingsPage() {
  const store = useGameStore();
  const [search, setSearch] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [configImportText, setConfigImportText] = useState('');
  const [showProfitNoticeModal, setShowProfitNoticeModal] = useState(false);

  const profitNotice = "当前计算基于“料理售价减去全部食材（含加料）的理论成本”。由于游戏内实际食材成本更低，且实际收入通常还包含小费等额外收益，因此该面板利润会远低于您的实际利润，数据仅供参考。";

  const os = getOS();
  const savePath = SAVE_PATHS[os];

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        store.importSave(ev.target?.result as string);
        const s = useGameStore.getState();
        const recipeCount = Object.values(s.recipeFilter).filter((v) => v !== 'disabled').length;
        const bevCount = Object.values(s.beverageFilter).filter((v) => v !== 'disabled').length;
        setImportStatus(`导入成功! 料理: ${recipeCount}, 酒水: ${bevCount}`);
      } catch {
        setImportStatus('导入失败: 文件格式无效');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const copyPath = () => {
    navigator.clipboard.writeText(savePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [editOwnership, setEditOwnership] = useState(false);

  const ownedRecipeSet = new Set(store.ownedRecipeIds);
  const ownedBevSet = new Set(store.ownedBeverageIds);
  const ownedIngredientSet = new Set(store.ownedIngredientIds);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">设置</h1>

      {/* 存档导入 */}
      <Card>
        <CardHeader><CardTitle>存档导入</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-secondary/60 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">
                {os === 'windows' ? 'Windows' : os === 'mac' ? 'macOS' : 'Linux'} 存档路径:
              </p>
              <code className="text-xs bg-background px-2 py-1 rounded border block truncate select-all">{savePath}</code>
            </div>
            <Button size="sm" variant="outline" onClick={copyPath} className="shrink-0">
              {copied ? '已复制' : '复制路径'}
            </Button>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
          >
            <p className="text-sm text-muted-foreground mb-2">拖拽 Mystia#x.memory 到此处，或点击下方按钮选择</p>
            <label className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
              <Input type="file" accept=".memory" onChange={handleImport} className="hidden" />
              选择存档文件
            </label>
          </div>
          {importStatus && (
            <p className={`text-sm font-medium ${importStatus.includes('成功') ? 'text-green-600' : 'text-destructive'}`}>{importStatus}</p>
          )}
        </CardContent>
      </Card>

      {/* 配置导入/导出 */}
      <Card>
        <CardHeader><CardTitle>配置导入 / 导出</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">导出当前全部配置（过滤状态、持有数据、稀客设置等），可通过剪贴板或文件在不同设备间传输。</p>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => {
              const str = exportConfig(store);
              navigator.clipboard.writeText(str).then(() => {
                setConfigStatus('已复制到剪贴板');
                setTimeout(() => setConfigStatus(null), 3000);
              });
            }}>导出到剪贴板</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const str = exportConfig(store);
              downloadConfigFile(str);
              setConfigStatus('已下载配置文件');
              setTimeout(() => setConfigStatus(null), 3000);
            }}>导出为文件</Button>
          </div>

          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs mb-1 block">粘贴配置字符串:</Label>
              <Input
                placeholder="IZK..."
                value={configImportText}
                onChange={(e) => setConfigImportText(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              try {
                const data = importConfig(configImportText);
                store.importConfigData(data);
                setConfigStatus('从剪贴板导入成功');
                setConfigImportText('');
              } catch (err) {
                setConfigStatus(`导入失败: ${err instanceof Error ? err.message : '未知错误'}`);
              }
              setTimeout(() => setConfigStatus(null), 3000);
            }} disabled={!configImportText.trim()}>导入</Button>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const text = await readConfigFile();
                const data = importConfig(text);
                store.importConfigData(data);
                setConfigStatus('从文件导入成功');
              } catch (err) {
                setConfigStatus(`导入失败: ${err instanceof Error ? err.message : '未知错误'}`);
              }
              setTimeout(() => setConfigStatus(null), 3000);
            }}>从文件导入</Button>
          </div>

          {configStatus && (
            <p className={`text-sm font-medium ${configStatus.includes('成功') || configStatus.includes('已') ? 'text-green-600' : 'text-destructive'}`}>{configStatus}</p>
          )}
        </CardContent>
      </Card>

      {/* 流行标签 */}
      <Card>
        <CardHeader><CardTitle>流行料理标签</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <Label className="shrink-0 w-16">喜爱:</Label>
              <Select value={store.popularFoodTag ?? '_none'} onValueChange={(v) => store.setPopularFoodTag(v === '_none' ? null : v)}>
                <SelectTrigger className="w-36"><SelectValue placeholder="无" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">无</SelectItem>
                  {ALL_FOOD_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="shrink-0 w-16">厌恶:</Label>
              <Select value={store.popularHateFoodTag ?? '_none'} onValueChange={(v) => store.setPopularHateFoodTag(v === '_none' ? null : v)}>
                <SelectTrigger className="w-36"><SelectValue placeholder="无" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">无</SelectItem>
                  {ALL_FOOD_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary/25 p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">“明星店”效果</p>
              <p className="text-xs text-muted-foreground">
                开启后，含“招牌”标签的料理会额外获得“流行喜爱”效果（参考射命丸文符卡）。
              </p>
            </div>
            <Switch
              checked={store.famousShopEnabled}
              onCheckedChange={store.setFamousShopEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* 显示选项 */}
      <Card>
        <CardHeader><CardTitle>显示选项</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary/25 p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">料理利润计算</p>
              <p className="text-xs text-muted-foreground">
                控制普客和稀客结果中的“利润”字段显示。
              </p>
            </div>
            <Switch
              checked={store.showRecipeProfit}
              onCheckedChange={(checked) => {
                store.setShowRecipeProfit(checked);
                if (checked) {
                  setShowProfitNoticeModal(true);
                }
              }}
            />
          </div>

        </CardContent>
      </Card>

      {/* 料理/酒水过滤 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>料理与酒水过滤</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={editOwnership} onCheckedChange={setEditOwnership} />
                <Label className="text-sm">调整取得状态</Label>
              </div>
              <Input placeholder="搜索..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-36 h-8" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {editOwnership
              ? '点击项目可在「已取得」和「未取得」之间切换'
              : <>已取得的项目点击切换: {Object.entries(FILTER_LABELS).map(([k, v]) => (
                  <span key={k} className={`mx-0.5 px-2 py-0.5 rounded-full ${v.color}`}>{v.text}</span>
                ))}，未取得强制禁用</>
            }
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recipes">
            <TabsList>
              <TabsTrigger value="recipes">料理</TabsTrigger>
              <TabsTrigger value="beverages">酒水</TabsTrigger>
              <TabsTrigger value="ingredients">食材</TabsTrigger>
            </TabsList>

            <TabsContent value="recipes">
              <FilterGrid
                items={allRecipes as IRecipe[]}
                ownedSet={ownedRecipeSet}
                filterMap={store.recipeFilter}
                spriteType="recipe"
                indexMap={recipeIndexMap}
                search={search}
                editOwnership={editOwnership}
                onCycleFilter={store.cycleRecipeFilter}
                onToggleOwnership={store.toggleRecipeOwnership}
                onBatchOwned={(state) => store.setAllOwnedRecipes(state)}
              />
            </TabsContent>

            <TabsContent value="beverages">
              <FilterGrid
                items={allBeverages as IBeverage[]}
                ownedSet={ownedBevSet}
                filterMap={store.beverageFilter}
                spriteType="beverage"
                indexMap={beverageIndexMap}
                search={search}
                editOwnership={editOwnership}
                onCycleFilter={store.cycleBeverageFilter}
                onToggleOwnership={store.toggleBeverageOwnership}
                onBatchOwned={(state) => store.setAllOwnedBeverages(state)}
              />
            </TabsContent>

            <TabsContent value="ingredients">
              <IngredientFilterGrid
                items={allIngredients as IIngredient[]}
                ownedSet={ownedIngredientSet}
                filterMap={store.ingredientFilter}
                qtyMap={store.ownedIngredientQty}
                indexMap={ingredientIndexMap}
                search={search}
                editOwnership={editOwnership}
                onCycleFilter={store.cycleIngredientFilter}
                onToggleOwnership={store.toggleIngredientOwnership}
                onSetQty={store.setIngredientQty}
                onBatchOwned={(state) => store.setAllOwnedIngredients(state)}
                onBelowQty={store.setIngredientsBelowQty}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showProfitNoticeModal && (
        <div className="fixed inset-0 z-[110]">
          <button
            type="button"
            aria-label="关闭利润说明弹窗"
            className="absolute inset-0 bg-foreground/35 backdrop-blur-sm"
            onClick={() => setShowProfitNoticeModal(false)}
          />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="profit-notice-title"
              className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-[0_24px_80px_rgba(61,46,31,0.18)] sm:p-6"
            >
              <h3 id="profit-notice-title" className="text-lg font-semibold text-foreground">
                利润计算说明
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{profitNotice}</p>
              <div className="mt-5 flex justify-end">
                <Button onClick={() => setShowProfitNoticeModal(false)}>我知道了</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable filter grid for recipes / beverages */
function FilterGrid({
  items,
  ownedSet,
  filterMap,
  spriteType,
  indexMap,
  search,
  editOwnership,
  onCycleFilter,
  onToggleOwnership,
  onBatchOwned,
}: {
  items: Array<{ id: number; name: string }>;
  ownedSet: Set<number>;
  filterMap: Record<number, FilterState>;
  spriteType: SpriteType;
  indexMap: IndexMap;
  search: string;
  editOwnership: boolean;
  onCycleFilter: (id: number) => void;
  onToggleOwnership: (id: number) => void;
  onBatchOwned: (state: FilterState) => void;
}) {
  const owned = items.filter((i) => ownedSet.has(i.id) && (!search || i.name.includes(search)));
  const unowned = items.filter((i) => !ownedSet.has(i.id) && (!search || i.name.includes(search)));

  return (
    <div className="space-y-4">
      {/* 批量操作（仅在非编辑模式） */}
      {!editOwnership && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onBatchOwned('all')}>设为可用</Button>
          <Button size="sm" variant="outline" onClick={() => onBatchOwned('rare')}>设为仅稀客</Button>
          <Button size="sm" variant="outline" onClick={() => onBatchOwned('disabled')}>设为禁用</Button>
        </div>
      )}

      {/* 已取得 */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-foreground">已取得 ({owned.length})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {owned.map((item) => {
            const state = filterMap[item.id] ?? 'all';
            const label = FILTER_LABELS[state];
            return (
              <button
                key={item.id}
                onClick={() => editOwnership ? onToggleOwnership(item.id) : onCycleFilter(item.id)}
                className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-sm cursor-pointer transition-all hover:shadow-sm ${
                  editOwnership
                    ? 'border-green-300 bg-green-50'
                    : state === 'disabled'
                      ? 'opacity-50 border-border'
                      : 'border-primary/30 bg-card'
                }`}
              >
                <Sprite type={spriteType} index={indexMap.get(item.id) ?? 0} size={32} className="rounded shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-xs">{item.name}</p>
                  {editOwnership
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500 text-white">已取得</span>
                    : <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${label.color}`}>{label.text}</span>
                  }
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 未取得 */}
      {(editOwnership || unowned.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">未取得 ({unowned.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
            {unowned.map((item) => (
              <button
                key={item.id}
                onClick={() => editOwnership ? onToggleOwnership(item.id) : undefined}
                className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-sm transition-all ${
                  editOwnership
                    ? 'cursor-pointer border-border hover:border-green-300 hover:shadow-sm'
                    : 'opacity-30 border-border cursor-default'
                }`}
                disabled={!editOwnership}
              >
                <Sprite type={spriteType} index={indexMap.get(item.id) ?? 0} size={32} className="rounded shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-xs">{item.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-300 text-gray-600">
                    {editOwnership ? '点击取得' : '禁用'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Ingredient filter grid with quantity threshold */
function IngredientFilterGrid({
  items,
  ownedSet,
  filterMap,
  qtyMap,
  indexMap,
  search,
  editOwnership,
  onCycleFilter,
  onToggleOwnership,
  onSetQty,
  onBatchOwned,
  onBelowQty,
}: {
  items: Array<{ id: number; name: string }>;
  ownedSet: Set<number>;
  filterMap: Record<number, FilterState>;
  qtyMap: Record<number, number>;
  indexMap: IndexMap;
  search: string;
  editOwnership: boolean;
  onCycleFilter: (id: number) => void;
  onToggleOwnership: (id: number) => void;
  onSetQty: (id: number, qty: number) => void;
  onBatchOwned: (state: FilterState) => void;
  onBelowQty: (qty: number, state: FilterState) => void;
}) {
  const [qtyThreshold, setQtyThreshold] = useState(5);
  const [editingQtyId, setEditingQtyId] = useState<number | null>(null);
  const [editingQtyText, setEditingQtyText] = useState('');

  const commitQty = () => {
    if (editingQtyId == null) return;
    const parsed = Number(editingQtyText);
    const next = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    onSetQty(editingQtyId, next);
    setEditingQtyId(null);
    setEditingQtyText('');
  };

  const owned = items.filter((i) => ownedSet.has(i.id) && (!search || i.name.includes(search)));
  const unowned = items.filter((i) => !ownedSet.has(i.id) && (!search || i.name.includes(search)));

  return (
    <div className="space-y-4">
      {!editOwnership && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => onBatchOwned('all')}>设为可用</Button>
            <Button size="sm" variant="outline" onClick={() => onBatchOwned('rare')}>设为仅稀客</Button>
            <Button size="sm" variant="outline" onClick={() => onBatchOwned('disabled')}>设为禁用</Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs whitespace-nowrap">低于</Label>
            <Input type="number" min={1} max={99} value={qtyThreshold} onChange={(e) => setQtyThreshold(Number(e.target.value))} className="w-14 h-7 text-xs px-1" />
            <Label className="text-xs whitespace-nowrap">个的食材:</Label>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onBelowQty(qtyThreshold, 'rare')}>设为仅稀客</Button>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onBelowQty(qtyThreshold, 'disabled')}>设为禁用</Button>
          </div>
        </div>
      )}

      {/* 已取得 */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-foreground">已取得 ({owned.length})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {owned.map((item) => {
            const state = filterMap[item.id] ?? 'all';
            const label = FILTER_LABELS[state];
            const qty = qtyMap[item.id] ?? 0;
            return (
              <button
                key={item.id}
                onClick={() => editOwnership ? onToggleOwnership(item.id) : onCycleFilter(item.id)}
                className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-sm cursor-pointer transition-all hover:shadow-sm ${
                  editOwnership
                    ? 'border-green-300 bg-green-50'
                    : state === 'disabled'
                      ? 'opacity-50 border-border'
                      : 'border-primary/30 bg-card'
                }`}
              >
                <Sprite type="ingredient" index={indexMap.get(item.id) ?? 0} size={32} className="rounded shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-xs">{item.name}</p>
                  <div className="flex items-center gap-1">
                    {editOwnership
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500 text-white">已取得</span>
                      : <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${label.color}`}>{label.text}</span>
                    }
                  </div>
                </div>
                <div
                  className="w-16 h-8 rounded-md border border-border bg-background/80 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingQtyId(item.id);
                    setEditingQtyText(String(qty));
                  }}
                >
                  {editingQtyId === item.id ? (
                    <input
                      type="number"
                      min={0}
                      autoFocus
                      className="h-7 w-14 rounded-md border border-input bg-transparent px-1 text-center text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      value={editingQtyText}
                      onChange={(e) => setEditingQtyText(e.target.value)}
                      onBlur={commitQty}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitQty();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">×{qty}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 未取得 */}
      {(editOwnership || unowned.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">未取得 ({unowned.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
            {unowned.map((item) => (
              <button
                key={item.id}
                onClick={() => editOwnership ? onToggleOwnership(item.id) : undefined}
                className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-sm transition-all ${
                  editOwnership
                    ? 'cursor-pointer border-border hover:border-green-300 hover:shadow-sm'
                    : 'opacity-30 border-border cursor-default'
                }`}
                disabled={!editOwnership}
              >
                <Sprite type="ingredient" index={indexMap.get(item.id) ?? 0} size={32} className="rounded shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-xs">{item.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-300 text-gray-600">
                    {editOwnership ? '点击取得' : '禁用'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
