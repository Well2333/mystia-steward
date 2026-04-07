import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/stores/game-store';
import { RegionSelector } from '@/components/RegionSelector';
import { TagBadge } from '@/components/TagBadge';
import { Sprite } from '@/components/Sprite';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  getRareCustomersByPlace,
  rankRecipesForRare,
  rankBeveragesForRare,
} from '@/lib/rare-recommend';
import { recipeIndexMap, beverageIndexMap, rareCustomerIndexMap } from '@/lib/sprite-index';
import type { ICustomerRare, IRareRecipeResult, TPlace } from '@/lib/types';

const RATING_COLORS: Record<string, string> = {
  极佳: 'bg-pink-500 text-white',
  佳: 'bg-orange-500 text-white',
  一般: 'bg-gray-400 text-white',
};
const EMPTY_BEVERAGES: ReturnType<typeof rankBeveragesForRare> = [];


export function RarePage() {
  const store = useGameStore();
  const place = store.rareSelectedPlace;
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const allCustomers = useMemo(() => (place ? getRareCustomersByPlace(place) : []), [place]);
  const visibleCustomers = useMemo(
    () => allCustomers.filter((c) => !store.rareHiddenCustomerIds.includes(c.id)),
    [allCustomers, store.rareHiddenCustomerIds],
  );
  const selectedCustomer = useMemo(
    () => allCustomers.find((c) => c.id === selectedCustomerId) ?? null,
    [allCustomers, selectedCustomerId],
  );

  const savedTags = selectedCustomerId != null ? store.rareCustomerTags[selectedCustomerId] : null;
  const requiredFoodTag = savedTags?.food ?? null;
  const requiredBevTag = savedTags?.bev ?? null;

  const handlePlaceChange = (p: TPlace) => { store.setRareSelectedPlace(p); setSelectedCustomerId(null); };
  const handleSelectCustomer = (c: ICustomerRare) => { setSelectedCustomerId(c.id); };
  const setFoodTag = (tag: string) => { if (selectedCustomerId != null) store.setRareCustomerTag(selectedCustomerId, tag, requiredBevTag); };
  const setBevTag = (tag: string) => { if (selectedCustomerId != null) store.setRareCustomerTag(selectedCustomerId, requiredFoodTag, tag); };

  const rareRecipeIds = useMemo(() => store.getRareRecipeIds(), [store.recipeFilter]);
  const rareBevIds = useMemo(() => store.getRareBeverageIds(), [store.beverageFilter]);
  const rareIngredientIds = useMemo(() => store.getRareIngredientIds(), [store.ingredientFilter]);

  const rawBevResults = useMemo(() => {
    if (!selectedCustomer || !requiredBevTag) return EMPTY_BEVERAGES;
    return rankBeveragesForRare(selectedCustomer, requiredBevTag, new Set(rareBevIds));
  }, [selectedCustomer, requiredBevTag, rareBevIds]);

  const topBevScore = rawBevResults[0]?.bevScore ?? 0;
  const topBevMeets = rawBevResults[0]?.meetsRequiredBev ?? false;

  const [rawRecipeResults, setRawRecipeResults] = useState<IRareRecipeResult[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const computeIdRef = useRef(0);

  useEffect(() => {
    if (!selectedCustomer || !requiredFoodTag || !requiredBevTag) {
      setRawRecipeResults((prev) => (prev.length === 0 ? prev : []));
      setRecipeLoading(false);
      return;
    }
    const id = ++computeIdRef.current;
    setRecipeLoading(true);
    // 使用 setTimeout 将计算推迟到下一帧，避免阻塞渲染
    const timer = setTimeout(() => {
      const results = rankRecipesForRare(selectedCustomer, requiredFoodTag, requiredBevTag, new Set(rareRecipeIds), new Set(rareIngredientIds), new Set(store.rareDisabledIngredientIds), store.popularFoodTag, store.popularHateFoodTag, topBevScore, topBevMeets);
      if (id === computeIdRef.current) {
        setRawRecipeResults(results);
        setRecipeLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedCustomer, requiredFoodTag, requiredBevTag, rareRecipeIds, rareIngredientIds, store.rareDisabledIngredientIds, store.popularFoodTag, store.popularHateFoodTag, topBevScore, topBevMeets]);

  const recipeResults = useMemo(() => {
    if (store.rareHideNonPerfect) {
      return rawRecipeResults.filter((r) => r.rating === '极佳');
    }
    return rawRecipeResults;
  }, [rawRecipeResults, store.rareHideNonPerfect]);

  const beverageResults = rawBevResults;

  const hasResults = requiredFoodTag && requiredBevTag && (recipeLoading || recipeResults.length > 0 || rawBevResults.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">稀客推荐</h1>
        <RegionSelector value={place} onChange={handlePlaceChange} />
        {place && (
          <Button size="sm" variant="outline" onClick={() => setShowFilter(!showFilter)}>
            {showFilter ? '隐藏过滤' : '过滤稀客'}
          </Button>
        )}
      </div>

      {!place && <div className="text-center py-16 text-muted-foreground text-lg">请先选择地区</div>}

      {showFilter && place && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">隐藏未遇到的稀客</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allCustomers.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <Switch checked={!store.rareHiddenCustomerIds.includes(c.id)} onCheckedChange={() => store.toggleRareHiddenCustomer(c.id)} />
                  <Sprite type="customer_rare" index={rareCustomerIndexMap.get(c.id) ?? 0} size={28} className="rounded" />
                  <span className={store.rareHiddenCustomerIds.includes(c.id) ? 'text-muted-foreground line-through' : ''}>{c.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 稀客头像选择 */}
      {place && visibleCustomers.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {visibleCustomers.map((c) => {
            const isSelected = selectedCustomerId === c.id;
            const hasTags = store.rareCustomerTags[c.id]?.food && store.rareCustomerTags[c.id]?.bev;
            return (
              <button key={c.id} onClick={() => handleSelectCustomer(c)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer relative ${isSelected ? 'bg-primary/10 ring-2 ring-primary shadow-sm' : 'hover:bg-secondary'}`}>
                <Sprite type="customer_rare" index={rareCustomerIndexMap.get(c.id) ?? 0} size={56} className="rounded-lg" />
                <span className={`text-xs ${isSelected ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{c.name}</span>
                {hasTags && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-500 rounded-full" />}
              </button>
            );
          })}
        </div>
      )}

      {/* 稀客信息卡 + 点单选择 */}
      {selectedCustomer && (
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex gap-4 items-start">
              <Sprite type="customer_rare" index={rareCustomerIndexMap.get(selectedCustomer.id) ?? 0} size={80} className="rounded-xl border border-border shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-foreground">{selectedCustomer.name}</h3>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">¥{selectedCustomer.price[0]}~¥{selectedCustomer.price[1]}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">喜好:</span>
                  {selectedCustomer.positiveTags.map((t) => <TagBadge key={t} tag={t} variant="positive" />)}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">厌恶:</span>
                  {selectedCustomer.negativeTags.map((t) => <TagBadge key={t} tag={t} variant="negative" />)}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">酒水:</span>
                  {selectedCustomer.beverageTags.map((t) => <TagBadge key={t} tag={t} variant="default" />)}
                </div>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold mb-2">点单料理 Tag:</p>
                <div className="flex gap-1 flex-wrap">
                  {selectedCustomer.positiveTags.map((tag) => (
                    <Button key={tag} size="sm" variant={requiredFoodTag === tag ? 'default' : 'outline'} onClick={() => setFoodTag(tag)} className="text-xs h-7 rounded-full">{tag}</Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">点单酒水 Tag:</p>
                <div className="flex gap-1 flex-wrap">
                  {selectedCustomer.beverageTags.map((tag) => (
                    <Button key={tag} size="sm" variant={requiredBevTag === tag ? 'default' : 'outline'} onClick={() => setBevTag(tag)} className="text-xs h-7 rounded-full">{tag}</Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 推荐结果：菜谱 + 酒水并列 */}
      {hasResults && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 菜谱区域 */}
          <div className="lg:col-span-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold">
                菜谱 {recipeLoading ? '(计算中...)' : `(${recipeResults.length}${store.rareHideNonPerfect ? ` / ${rawRecipeResults.length}` : ''})`}
              </h2>
              <div className="flex items-center gap-2">
                <Switch checked={store.rareHideNonPerfect} onCheckedChange={store.setRareHideNonPerfect} />
                <Label className="text-xs text-muted-foreground whitespace-nowrap">隐藏非极佳</Label>
              </div>
            </div>
            {recipeLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <span className="animate-pulse">正在计算推荐菜谱...</span>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-4">
                  {recipeResults.map((r, idx) => (
                    <RareRecipeCard key={r.recipe.id} r={r} idx={idx} customer={selectedCustomer!} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* 酒水区域 */}
          <div className="lg:col-span-2 space-y-2">
            <h2 className="text-base font-semibold">酒水 ({beverageResults.length})</h2>
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 pr-4">
                {beverageResults.map((b, idx) => (
                  <div key={b.beverage.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow">
                    <Sprite type="beverage" index={beverageIndexMap.get(b.beverage.id) ?? 0} size={32} className="rounded border border-border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                        <span className="text-sm font-medium truncate">{b.beverage.name}</span>
                        <span className="text-xs text-primary">¥{b.beverage.price}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>匹配 {b.bevScore}</span>
                        {b.meetsRequiredBev && <span className="text-blue-600 font-medium">满足点单</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {requiredFoodTag && requiredBevTag && recipeResults.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">没有找到符合条件的菜谱</div>
      )}
    </div>
  );
}

/** 构建tag详情用于tooltip展示 */
function buildTagDetails(
  r: IRareRecipeResult,
  customer: ICustomerRare,
): Array<{ tag: string; isExtra: boolean; isPositive: boolean; isNegative: boolean }> {
  const recipeTags = new Set(r.recipe.positiveTags);

  const details: Array<{ tag: string; isExtra: boolean; isPositive: boolean; isNegative: boolean }> = [];
  const seen = new Set<string>();

  for (const tag of r.allTags) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    const isExtra = !recipeTags.has(tag);
    const isPositive = customer.positiveTags.includes(tag);
    const isNegative = customer.negativeTags.includes(tag);
    details.push({ tag, isExtra, isPositive, isNegative });
  }

  // Also show cancelled tags
  for (const tag of r.cancelledTags) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    const isExtra = !recipeTags.has(tag);
    const isNegative = customer.negativeTags.includes(tag);
    details.push({ tag: `${tag}(抵消)`, isExtra, isPositive: false, isNegative });
  }

  return details;
}

function RareRecipeCard({ r, idx, customer }: {
  r: IRareRecipeResult;
  idx: number;
  customer: ICustomerRare;
}) {
  const [showTags, setShowTags] = useState(false);
  const profit = r.recipe.price - r.baseCost - r.extraCost;
  const tagDetails = useMemo(
    () => buildTagDetails(r, customer),
    [r, customer],
  );

  return (
    <div
      className="relative p-2 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow"
      onMouseEnter={() => setShowTags(true)}
      onMouseLeave={() => setShowTags(false)}
    >
      <div className="flex items-center gap-2">
        <Sprite type="recipe" index={recipeIndexMap.get(r.recipe.id) ?? 0} size={36} className="rounded border border-border shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
            <span className="text-sm font-semibold truncate">{r.recipe.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${RATING_COLORS[r.rating]}`}>{r.rating}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
            <span className="text-primary font-medium">¥{r.recipe.price}</span>
            <span className="px-1 py-0 rounded bg-secondary">{r.recipe.cooker}</span>
            <span>利润 ¥{profit}</span>
            <span>得分 {r.foodScore}</span>
            {r.meetsRequiredFood && <span className="text-blue-600 font-medium">满足</span>}
          </div>
          {/* 原料 + 加料 */}
          <div className="flex gap-0.5 mt-0.5 flex-wrap">
            {r.recipe.ingredients.map((name) => (
              <span key={name} className="text-[10px] px-1 py-0 rounded bg-green-100 text-green-800 border border-green-200">{name}</span>
            ))}
            {r.extraIngredients.map((i) => (
              <span key={i.id} className="text-[10px] px-1 py-0 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">+{i.name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 悬浮Tag tooltip */}
      {showTags && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 p-2 rounded-lg border border-border bg-popover shadow-lg">
          <div className="flex flex-wrap gap-1">
            {tagDetails.map((td) => {
              let cls = 'bg-gray-100 text-gray-700 border-gray-200';
              if (td.isPositive) cls = 'bg-pink-100 text-pink-800 border-pink-200';
              if (td.isNegative) cls = 'bg-amber-800/20 text-amber-900 border-amber-400';
              return (
                <span key={td.tag} className={`text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>
                  {td.isExtra && '+'}{td.tag}{td.isNegative && ' ✕'}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
