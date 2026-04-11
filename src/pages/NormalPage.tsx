import { useMemo, useState } from 'react';
import { useGameStore } from '@/stores/game-store';
import { RegionSelector } from '@/components/RegionSelector';
import { TagBadge } from '@/components/TagBadge';
import { Sprite } from '@/components/Sprite';
import { CustomerScoreBadges } from '@/components/ScoreBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  computeNormalRecipeResults,
  computeNormalBeverageResults,
  getNormalCustomersByPlace,
} from '@/lib/normal-recommend';
import { recipeIndexMap, beverageIndexMap, normalCustomerIndexMap } from '@/lib/sprite-index';
import type { INormalRecipeResult, INormalBeverageResult } from '@/lib/types';

type SortMode = 'coverage' | 'price';
type BevSortMode = 'coverage' | 'price';
type ViewTab = 'recipes' | 'beverages';

export function NormalPage() {
  const store = useGameStore();
  const place = store.normalSelectedPlace;
  const showRecipeProfit = store.showRecipeProfit;
  const [sortMode, setSortMode] = useState<SortMode>('coverage');
  const [bevSortMode, setBevSortMode] = useState<BevSortMode>('coverage');
  const [viewTab, setViewTab] = useState<ViewTab>('recipes');

  const customers = useMemo(
    () => (place ? getNormalCustomersByPlace(place) : []),
    [place],
  );

  const normalRecipeIds = store.getNormalRecipeIds();
  const normalBevIds = store.getNormalBeverageIds();

  const rawRecipeResults = useMemo(() => {
    if (!place) return [];
    return computeNormalRecipeResults(place, new Set(normalRecipeIds), new Set<number>(), store.popularFoodTag, store.popularHateFoodTag);
  }, [place, normalRecipeIds, store.popularFoodTag, store.popularHateFoodTag]);

  const rawBevResults = useMemo(() => {
    if (!place) return [];
    return computeNormalBeverageResults(place, new Set(normalBevIds));
  }, [place, normalBevIds]);

  const recipeResults = useMemo(() => {
    const sorted = [...rawRecipeResults];
    sorted.sort((a, b) => {
      if (sortMode === 'price') {
        if (b.recipe.price !== a.recipe.price) return b.recipe.price - a.recipe.price;
        return b.totalCoverage - a.totalCoverage;
      }
      if (b.totalCoverage !== a.totalCoverage) return b.totalCoverage - a.totalCoverage;
      return b.recipe.price - a.recipe.price;
    });
    return sorted;
  }, [rawRecipeResults, sortMode]);

  const beverageResults = useMemo(() => {
    const sorted = [...rawBevResults];
    sorted.sort((a, b) => {
      if (bevSortMode === 'price') {
        if (b.beverage.price !== a.beverage.price) return b.beverage.price - a.beverage.price;
        return b.totalCoverage - a.totalCoverage;
      }
      if (b.totalCoverage !== a.totalCoverage) return b.totalCoverage - a.totalCoverage;
      return b.beverage.price - a.beverage.price;
    });
    return sorted;
  }, [rawBevResults, bevSortMode]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">普客推荐</h1>
        <RegionSelector value={place} onChange={store.setNormalSelectedPlace} />
      </div>

      {!place && <div className="text-center py-16 text-muted-foreground text-lg">请先选择地区</div>}

      {place && normalRecipeIds.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">尚未设置可用菜谱，请先前往设置页导入存档或手动勾选</div>
      )}

      {place && (rawRecipeResults.length > 0 || rawBevResults.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {/* Tab + Sort controls */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1">
                <Button size="sm" variant={viewTab === 'recipes' ? 'default' : 'outline'} onClick={() => setViewTab('recipes')} className="rounded-full">
                  菜谱 ({recipeResults.length})
                </Button>
                <Button size="sm" variant={viewTab === 'beverages' ? 'default' : 'outline'} onClick={() => setViewTab('beverages')} className="rounded-full">
                  酒水 ({beverageResults.length})
                </Button>
              </div>
              {viewTab === 'recipes' && (
                <div className="flex gap-1">
                  <Button size="sm" variant={sortMode === 'coverage' ? 'default' : 'outline'} onClick={() => setSortMode('coverage')} className="text-xs h-7 rounded-full">覆盖优先</Button>
                  <Button size="sm" variant={sortMode === 'price' ? 'default' : 'outline'} onClick={() => setSortMode('price')} className="text-xs h-7 rounded-full">价格优先</Button>
                </div>
              )}
              {viewTab === 'beverages' && (
                <div className="flex gap-1">
                  <Button size="sm" variant={bevSortMode === 'coverage' ? 'default' : 'outline'} onClick={() => setBevSortMode('coverage')} className="text-xs h-7 rounded-full">匹配优先</Button>
                  <Button size="sm" variant={bevSortMode === 'price' ? 'default' : 'outline'} onClick={() => setBevSortMode('price')} className="text-xs h-7 rounded-full">高价优先</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
                {viewTab === 'recipes' && recipeResults.map((r, idx) => (
                  <RecipeCard key={r.recipe.id} r={r} idx={idx} showRecipeProfit={showRecipeProfit} />
                ))}
                {viewTab === 'beverages' && beverageResults.map((b, idx) => (
                  <BeverageCard key={b.beverage.id} b={b} idx={idx} />
                ))}
            </div>
          </div>

          {/* 普客一览 */}
          <div>
            <h2 className="text-lg font-semibold mb-3">地区普客 ({customers.length})</h2>
            <ScrollArea className="h-[650px]">
              <div className="space-y-2 pr-4">
                {customers.map((c) => (
                  <Card key={c.id} className="bg-card">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sprite type="customer_normal" index={normalCustomerIndexMap.get(c.id) ?? 0} size={48} className="rounded-lg border border-border" />
                        <span className="font-semibold text-sm">{c.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.positiveTags.map((tag) => <TagBadge key={tag} tag={tag} variant="preferred" />)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.beverageTags.map((tag) => <TagBadge key={tag} tag={tag} variant="default" />)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeCard({ r, idx, showRecipeProfit }: { r: INormalRecipeResult; idx: number; showRecipeProfit: boolean }) {
  return (
    <Card className="hover:shadow-md transition-shadow bg-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Sprite type="recipe" index={recipeIndexMap.get(r.recipe.id) ?? 0} size={44} className="rounded-lg border border-border shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
              <span className="font-semibold text-foreground">{r.recipe.name}</span>
              <span className="text-sm font-medium text-primary">¥{r.recipe.price}</span>
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                {r.recipe.cooker || '未知厨具'}
              </span>
              {showRecipeProfit && <span className="text-xs text-muted-foreground">利润 ¥{r.profit}</span>}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {r.recipe.positiveTags.map((tag) => <TagBadge key={tag} tag={tag} variant={r.matchedTags.includes(tag) ? 'matched' : 'default'} />)}
            </div>
            <div className="mt-1"><CustomerScoreBadges scores={r.customerScores} /></div>
            <p className="text-xs text-muted-foreground mt-0.5">食材: {r.recipe.ingredients.join(', ')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BeverageCard({ b, idx }: { b: INormalBeverageResult; idx: number }) {
  return (
    <Card className="hover:shadow-md transition-shadow bg-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Sprite type="beverage" index={beverageIndexMap.get(b.beverage.id) ?? 0} size={36} className="rounded-lg border border-border shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
              <span className="font-medium">{b.beverage.name}</span>
              <span className="text-sm text-primary">¥{b.beverage.price}</span>
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {b.beverage.tags.map((tag) => <TagBadge key={tag} tag={tag} variant={b.matchedTags.includes(tag) ? 'matched' : 'default'} />)}
            </div>
            <div className="mt-1"><CustomerScoreBadges scores={b.customerScores} /></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
