import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { useGameStore } from '@/stores/game-store';
import { RegionSelector } from '@/components/RegionSelector';
import { TagBadge } from '@/components/TagBadge';
import { Sprite } from '@/components/Sprite';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  getAllRareCustomers,
  getRareCustomersByPlace,
  rankRecipesForRare,
  rankBeveragesForRare,
} from '@/lib/rare-recommend';
import { recipeIndexMap, beverageIndexMap, rareCustomerIndexMap } from '@/lib/sprite-index';
import type { ICustomerRare, IRareRecipeResult, TPlace, TRating } from '@/lib/types';

const RATING_COLORS: Record<TRating, string> = {
  ExGood: 'bg-pink-500 text-white',
  Good: 'bg-orange-500 text-white',
  Normal: 'bg-green-500 text-white',
  Bad: 'bg-purple-500 text-white',
  ExBad: 'bg-gray-900 text-white',
};

const RATING_LABELS: Record<TRating, string> = {
  ExGood: '极佳',
  Good: '佳',
  Normal: '普通',
  Bad: '差',
  ExBad: '极差',
};
const EMPTY_BEVERAGES: ReturnType<typeof rankBeveragesForRare> = [];
const NON_ORDERABLE_RARE_FOOD_TAGS = new Set(['流行喜爱', '流行厌恶']);

function isOrderableRareFoodTag(tag: string): boolean {
  return !NON_ORDERABLE_RARE_FOOD_TAGS.has(tag);
}

function buildRareContextKey(customerId: number, foodTag: string, bevTag: string): string {
  return `${customerId}|${foodTag}|${bevTag}`;
}


export function RarePage() {
  const place = useGameStore((state) => state.rareSelectedPlace);
  const rareHiddenCustomerIds = useGameStore((state) => state.rareHiddenCustomerIds);
  const rareExtraCustomerIds = useGameStore((state) => state.rareExtraCustomerIds);
  const rareCustomerTags = useGameStore((state) => state.rareCustomerTags);
  const rareRecipeFilterMode = useGameStore((state) => state.rareRecipeFilterMode);
  const rareHideBelowScore = useGameStore((state) => state.rareHideBelowScore);
  const rareMaxExtraIngredients = useGameStore((state) => state.rareMaxExtraIngredients);
  const rareRecipePriceSort = useGameStore((state) => state.rareRecipePriceSort);
  const rareBeveragePriceSort = useGameStore((state) => state.rareBeveragePriceSort);
  const rareFavoriteRecipesByCustomer = useGameStore((state) => state.rareFavoriteRecipesByCustomer);
  const rareFavoriteBeverages = useGameStore((state) => state.rareFavoriteBeverages);
  const rareDisabledIngredientIds = useGameStore((state) => state.rareDisabledIngredientIds);
  const popularFoodTag = useGameStore((state) => state.popularFoodTag);
  const popularHateFoodTag = useGameStore((state) => state.popularHateFoodTag);
  const showRecipeProfit = useGameStore((state) => state.showRecipeProfit);
  const ownedIngredientQty = useGameStore((state) => state.ownedIngredientQty);
  const setRareSelectedPlace = useGameStore((state) => state.setRareSelectedPlace);
  const setRareCustomerTag = useGameStore((state) => state.setRareCustomerTag);
  const toggleRareHiddenCustomer = useGameStore((state) => state.toggleRareHiddenCustomer);
  const addRareExtraCustomer = useGameStore((state) => state.addRareExtraCustomer);
  const removeRareExtraCustomer = useGameStore((state) => state.removeRareExtraCustomer);
  const setRareRecipeFilterMode = useGameStore((state) => state.setRareRecipeFilterMode);
  const setRareHideBelowScore = useGameStore((state) => state.setRareHideBelowScore);
  const setRareMaxExtraIngredients = useGameStore((state) => state.setRareMaxExtraIngredients);
  const toggleRareRecipePriceSort = useGameStore((state) => state.toggleRareRecipePriceSort);
  const toggleRareBeveragePriceSort = useGameStore((state) => state.toggleRareBeveragePriceSort);
  const toggleRareFavoriteRecipe = useGameStore((state) => state.toggleRareFavoriteRecipe);
  const toggleRareFavoriteBeverage = useGameStore((state) => state.toggleRareFavoriteBeverage);
  const getRareRecipeIds = useGameStore((state) => state.getRareRecipeIds);
  const getRareBeverageIds = useGameStore((state) => state.getRareBeverageIds);
  const getRareIngredientIds = useGameStore((state) => state.getRareIngredientIds);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [pendingAddCustomerIds, setPendingAddCustomerIds] = useState<number[]>([]);

  const allRareCustomers = useMemo(() => getAllRareCustomers(), []);
  const allCustomers = useMemo(() => {
    if (!place) return [];

    const byId = new Map<number, ICustomerRare>();
    for (const customer of getRareCustomersByPlace(place)) {
      byId.set(customer.id, customer);
    }
    for (const customerId of rareExtraCustomerIds) {
      const customer = allRareCustomers.find((c) => c.id === customerId);
      if (!customer) continue;
      byId.set(customer.id, customer);
    }
    return [...byId.values()];
  }, [place, rareExtraCustomerIds, allRareCustomers]);
  const visibleCustomers = useMemo(
    () => allCustomers.filter((c) => !rareHiddenCustomerIds.includes(c.id)),
    [allCustomers, rareHiddenCustomerIds],
  );
  const addableCustomers = useMemo(() => {
    if (!place) return [];
    const shownIds = new Set(allCustomers.map((c) => c.id));
    return allRareCustomers.filter((c) => !shownIds.has(c.id));
  }, [place, allCustomers, allRareCustomers]);
  const addedCustomers = useMemo(() => {
    const byId = new Map(allRareCustomers.map((c) => [c.id, c]));
    return rareExtraCustomerIds
      .map((id) => byId.get(id))
      .filter((customer): customer is ICustomerRare => Boolean(customer));
  }, [allRareCustomers, rareExtraCustomerIds]);
  const selectedCustomer = useMemo(
    () => allCustomers.find((c) => c.id === selectedCustomerId) ?? null,
    [allCustomers, selectedCustomerId],
  );

  const savedTags = selectedCustomerId != null ? rareCustomerTags[selectedCustomerId] : null;
  const requiredFoodTag = savedTags?.food ?? null;
  const normalizedRequiredFoodTag =
    requiredFoodTag && isOrderableRareFoodTag(requiredFoodTag) ? requiredFoodTag : null;
  const requiredBevTag = savedTags?.bev ?? null;
  const selectableFoodTags = useMemo(
    () => (selectedCustomer ? selectedCustomer.positiveTags.filter(isOrderableRareFoodTag) : []),
    [selectedCustomer],
  );

  useEffect(() => {
    if (selectedCustomerId == null) return;
    if (!requiredFoodTag || isOrderableRareFoodTag(requiredFoodTag)) return;
    setRareCustomerTag(selectedCustomerId, null, requiredBevTag);
  }, [selectedCustomerId, requiredFoodTag, requiredBevTag, setRareCustomerTag]);

  const handlePlaceChange = (p: TPlace) => { setRareSelectedPlace(p); setSelectedCustomerId(null); };
  const handleSelectCustomer = (c: ICustomerRare) => { setSelectedCustomerId(c.id); };
  const handleTogglePendingCustomer = (id: number) => {
    setPendingAddCustomerIds((prev) => (
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    ));
  };
  const handleConfirmAddCustomers = () => {
    for (const id of pendingAddCustomerIds) {
      addRareExtraCustomer(id);
    }
    setPendingAddCustomerIds([]);
    setShowAddCustomerModal(false);
  };
  const setFoodTag = (tag: string) => { if (selectedCustomerId != null) setRareCustomerTag(selectedCustomerId, tag, requiredBevTag); };
  const setBevTag = (tag: string) => { if (selectedCustomerId != null) setRareCustomerTag(selectedCustomerId, normalizedRequiredFoodTag, tag); };
  const recipeFilterOption = useMemo(() => {
    if (rareRecipeFilterMode === 'exgood') return '非极佳';
    if (rareHideBelowScore >= 3) return '低于3分';
    if (rareHideBelowScore === 2) return '低于2分';
    if (rareHideBelowScore === 1) return '低于1分';
    return '低于0分';
  }, [rareRecipeFilterMode, rareHideBelowScore]);

  const handleRecipeFilterOptionChange = (value: string | null) => {
    if (!value) return;
    if (value === '非极佳') {
      setRareRecipeFilterMode('exgood');
      return;
    }

    const nextScore = value === '低于3分'
      ? 3
      : value === '低于2分'
        ? 2
        : value === '低于1分'
          ? 1
          : 0;

    setRareRecipeFilterMode('score');
    setRareHideBelowScore(nextScore);
  };

  const rareRecipeIds = getRareRecipeIds();
  const rareBevIds = getRareBeverageIds();
  const rareIngredientIds = getRareIngredientIds();

  const rawBevResults = useMemo(() => {
    if (!selectedCustomer || !requiredBevTag) return EMPTY_BEVERAGES;
    return rankBeveragesForRare(selectedCustomer, requiredBevTag, new Set(rareBevIds));
  }, [selectedCustomer, requiredBevTag, rareBevIds]);

  const rawRecipeResults = useMemo(() => {
    if (!selectedCustomer || !normalizedRequiredFoodTag || !requiredBevTag) return [];
    return rankRecipesForRare(
      selectedCustomer,
      normalizedRequiredFoodTag,
      requiredBevTag,
      new Set(rareRecipeIds),
      new Set(rareIngredientIds),
      new Set(rareDisabledIngredientIds),
      popularFoodTag,
      popularHateFoodTag,
      rareMaxExtraIngredients,
      ownedIngredientQty,
    );
  }, [
    selectedCustomer,
    normalizedRequiredFoodTag,
    requiredBevTag,
    rareRecipeIds,
    rareIngredientIds,
    rareDisabledIngredientIds,
    popularFoodTag,
    popularHateFoodTag,
    rareMaxExtraIngredients,
    ownedIngredientQty,
  ]);

  const currentContextKey = useMemo(() => {
    if (!selectedCustomer || !normalizedRequiredFoodTag || !requiredBevTag) return null;
    return buildRareContextKey(selectedCustomer.id, normalizedRequiredFoodTag, requiredBevTag);
  }, [selectedCustomer, normalizedRequiredFoodTag, requiredBevTag]);

  const favoriteRecipeKeys = useMemo(() => {
    if (!selectedCustomer) return [];
    return rareFavoriteRecipesByCustomer[String(selectedCustomer.id)] ?? [];
  }, [selectedCustomer, rareFavoriteRecipesByCustomer]);
  const favoriteRecipeKeySet = useMemo(() => new Set(favoriteRecipeKeys), [favoriteRecipeKeys]);

  const favoriteBeverageIds = useMemo(
    () => (currentContextKey ? rareFavoriteBeverages[currentContextKey] ?? [] : []),
    [currentContextKey, rareFavoriteBeverages],
  );
  const favoriteBeverageIdSet = useMemo(() => new Set(favoriteBeverageIds), [favoriteBeverageIds]);

  const recipeResults = useMemo(() => {
    const filtered = rawRecipeResults.map((r, idx) => ({ r, idx }));

    const favoriteRank = new Map(favoriteRecipeKeys.map((id, idx) => [id, idx]));
    const priceDirection = rareRecipePriceSort === 'asc' ? 1 : -1;

    const favoriteItems = filtered.filter(({ r }) => favoriteRank.has(r.recipe.id));
    favoriteItems.sort((a, b) => {
      const aFavRank = favoriteRank.get(a.r.recipe.id) ?? Infinity;
      const bFavRank = favoriteRank.get(b.r.recipe.id) ?? Infinity;
      if (aFavRank !== bFavRank) return aFavRank - bFavRank;
      if (a.r.recipe.price !== b.r.recipe.price) {
        return priceDirection * (a.r.recipe.price - b.r.recipe.price);
      }
      return a.idx - b.idx;
    });

    const normalItems = filtered.filter(({ r }) => !favoriteRank.has(r.recipe.id));
    normalItems.sort((a, b) => {
      const aPassFilter = rareRecipeFilterMode === 'exgood'
        ? a.r.rating === 'ExGood'
        : a.r.foodScore >= rareHideBelowScore;
      const bPassFilter = rareRecipeFilterMode === 'exgood'
        ? b.r.rating === 'ExGood'
        : b.r.foodScore >= rareHideBelowScore;
      const aMatches = aPassFilter && a.r.extraIngredients.length <= rareMaxExtraIngredients;
      const bMatches = bPassFilter && b.r.extraIngredients.length <= rareMaxExtraIngredients;
      if (aMatches !== bMatches) return aMatches ? -1 : 1;
      if (a.r.recipe.price !== b.r.recipe.price) {
        return priceDirection * (a.r.recipe.price - b.r.recipe.price);
      }
      return a.idx - b.idx;
    });

    return [
      ...favoriteItems,
      ...normalItems.filter((x) => {
        const passFilter = rareRecipeFilterMode === 'exgood'
          ? x.r.rating === 'ExGood'
          : x.r.foodScore >= rareHideBelowScore;
        return passFilter && x.r.extraIngredients.length <= rareMaxExtraIngredients;
      }),
    ].map((x) => x.r);
  }, [
    rawRecipeResults,
    rareRecipeFilterMode,
    rareHideBelowScore,
    rareMaxExtraIngredients,
    favoriteRecipeKeys,
    rareRecipePriceSort,
  ]);

  const beverageResults = useMemo(() => {
    const withMeta = rawBevResults.map((b, idx) => ({ b, idx }));
    const priceDirection = rareBeveragePriceSort === 'asc' ? 1 : -1;

    withMeta.sort((a, b) => {
      if (a.b.meetsRequiredBev !== b.b.meetsRequiredBev) {
        return a.b.meetsRequiredBev ? -1 : 1;
      }

      if (a.b.beverage.price !== b.b.beverage.price) {
        return priceDirection * (a.b.beverage.price - b.b.beverage.price);
      }
      return a.idx - b.idx;
    });

    return withMeta.map((x) => x.b);
  }, [rawBevResults, rareBeveragePriceSort]);

  const hasResults = normalizedRequiredFoodTag && requiredBevTag && (recipeResults.length > 0 || beverageResults.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">稀客推荐</h1>
        <RegionSelector value={place} onChange={handlePlaceChange} />
        {place && (
          <>
            <Button size="sm" variant="outline" onClick={() => setShowFilter(!showFilter)}>
              {showFilter ? '隐藏过滤' : '过滤稀客'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPendingAddCustomerIds([]);
                setShowAddCustomerModal(true);
              }}
              disabled={addableCustomers.length === 0}
            >
              添加稀客
            </Button>
          </>
        )}
      </div>

      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="关闭添加稀客弹窗"
            className="absolute inset-0 bg-foreground/35 backdrop-blur-sm"
            onClick={() => {
              setPendingAddCustomerIds([]);
              setShowAddCustomerModal(false);
            }}
          />
          <div className="relative z-10 flex min-h-full items-center justify-center p-4">
            <Card className="w-full max-w-3xl border-border bg-card shadow-[0_24px_80px_rgba(61,46,31,0.18)]">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-foreground">添加稀客</h3>
                  <span className="text-xs text-muted-foreground">
                    可选 {addableCustomers.length} 位，已选 {pendingAddCustomerIds.length} 位
                  </span>
                </div>

                {addableCustomers.length > 0 ? (
                  <ScrollArea className="h-[360px] rounded-lg border border-border p-3">
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {addableCustomers.map((customer) => {
                        const selected = pendingAddCustomerIds.includes(customer.id);
                        return (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleTogglePendingCustomer(customer.id)}
                            className={`flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all ${selected ? 'bg-primary/10 ring-2 ring-primary shadow-sm' : 'hover:bg-secondary'}`}
                          >
                            <Sprite
                              type="customer_rare"
                              index={rareCustomerIndexMap.get(customer.id) ?? 0}
                              size={56}
                              className="rounded-lg"
                            />
                            <span className={`text-xs ${selected ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                              {customer.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="rounded-lg border border-border bg-secondary/35 p-6 text-center text-sm text-muted-foreground">
                    当前地区已无可添加稀客
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPendingAddCustomerIds([]);
                      setShowAddCustomerModal(false);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleConfirmAddCustomers}
                    disabled={pendingAddCustomerIds.length === 0}
                  >
                    添加选中稀客
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {place && addedCustomers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">已添加稀客:</span>
          {addedCustomers.map((customer) => (
            <Button
              key={customer.id}
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => removeRareExtraCustomer(customer.id)}
            >
              {customer.name} ×
            </Button>
          ))}
        </div>
      )}

      {!place && <div className="text-center py-16 text-muted-foreground text-lg">请先选择地区</div>}

      {showFilter && place && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">隐藏未遇到的稀客</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allCustomers.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <Switch checked={!rareHiddenCustomerIds.includes(c.id)} onCheckedChange={() => toggleRareHiddenCustomer(c.id)} />
                  <Sprite type="customer_rare" index={rareCustomerIndexMap.get(c.id) ?? 0} size={28} className="rounded" />
                  <span className={rareHiddenCustomerIds.includes(c.id) ? 'text-muted-foreground line-through' : ''}>{c.name}</span>
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
            const savedFoodTag = rareCustomerTags[c.id]?.food ?? null;
            const hasTags =
              !!savedFoodTag &&
              isOrderableRareFoodTag(savedFoodTag) &&
              !!rareCustomerTags[c.id]?.bev;
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
                  {selectedCustomer.positiveTags.map((t) => <TagBadge key={t} tag={t} variant="preferred" />)}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">厌恶:</span>
                  {selectedCustomer.negativeTags.map((t) => <TagBadge key={t} tag={t} variant="disliked" />)}
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
                  {selectableFoodTags.map((tag) => (
                    <Button key={tag} size="sm" variant={normalizedRequiredFoodTag === tag ? 'default' : 'outline'} onClick={() => setFoodTag(tag)} className="text-xs h-7 rounded-full">{tag}</Button>
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

      {/* 推荐结果：料理 + 酒水并列 */}
      {hasResults && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 料理区域 */}
          <div className="lg:col-span-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold">
                料理 ({recipeResults.length} / {rawRecipeResults.length})
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs py-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">隐藏</Label>
                <Select value={recipeFilterOption} onValueChange={handleRecipeFilterOptionChange}>
                  <SelectTrigger className="h-7 w-[132px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="非极佳">非极佳</SelectItem>
                    <SelectItem value="低于3分">低于3分</SelectItem>
                    <SelectItem value="低于2分">低于2分</SelectItem>
                    <SelectItem value="低于1分">低于1分</SelectItem>
                    <SelectItem value="低于0分">低于0分</SelectItem>
                  </SelectContent>
                </Select>
                <Label className="text-xs text-muted-foreground whitespace-nowrap">的料理</Label>
              </div>
              <Separator
                orientation="vertical"
                className="mx-0.5 data-vertical:h-7 data-vertical:self-center"
              />
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">最多加料</Label>
                <Select
                  value={String(rareMaxExtraIngredients)}
                  onValueChange={(value) => setRareMaxExtraIngredients(Number(value))}
                >
                  <SelectTrigger className="h-7 w-[76px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 个</SelectItem>
                    <SelectItem value="1">1 个</SelectItem>
                    <SelectItem value="2">2 个</SelectItem>
                    <SelectItem value="3">3 个</SelectItem>
                    <SelectItem value="4">4 个</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator
                orientation="vertical"
                className="mx-0.5 data-vertical:h-7 data-vertical:self-center"
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={toggleRareRecipePriceSort}>
                价格{rareRecipePriceSort === 'asc' ? '升序' : '降序'}
              </Button>
            </div>
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-4">
                {recipeResults.map((r, idx) => (
                  <RareRecipeCard
                    key={`${r.recipe.id}-${idx}`}
                    r={r}
                    idx={idx}
                    customer={selectedCustomer!}
                    showRecipeProfit={showRecipeProfit}
                    isFavorite={favoriteRecipeKeySet.has(r.recipe.id)}
                    onToggleFavorite={() => {
                      if (!selectedCustomer) return;
                      toggleRareFavoriteRecipe(selectedCustomer.id, r.recipe.id);
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 酒水区域 */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">酒水 ({beverageResults.length})</h2>
            </div>
            <div className="flex items-center gap-2 text-xs py-1">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={toggleRareBeveragePriceSort}>
                价格{rareBeveragePriceSort === 'asc' ? '升序' : '降序'}
              </Button>
            </div>
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
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentContextKey) return;
                            toggleRareFavoriteBeverage(currentContextKey, b.beverage.id);
                          }}
                          className="ml-auto inline-flex items-center justify-center rounded p-0.5 text-amber-500 hover:bg-amber-100"
                          aria-label={favoriteBeverageIdSet.has(b.beverage.id) ? '取消收藏酒水' : '收藏酒水'}
                        >
                          <Star className={`size-3.5 ${favoriteBeverageIdSet.has(b.beverage.id) ? 'fill-current' : ''}`} />
                        </button>
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

      {normalizedRequiredFoodTag && requiredBevTag && recipeResults.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">没有找到符合条件的料理</div>
      )}
    </div>
  );
}

/** 构建tag详情用于tooltip展示 */
function buildTagDetails(
  r: IRareRecipeResult,
  customer: ICustomerRare,
): Array<{ tag: string; isExtra: boolean; isPreferred: boolean; isDisliked: boolean; isCancelled: boolean }> {
  const recipeTags = new Set(r.recipe.positiveTags);

  const details: Array<{ tag: string; isExtra: boolean; isPreferred: boolean; isDisliked: boolean; isCancelled: boolean }> = [];
  const seen = new Set<string>();

  for (const tag of r.allTags) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    const isExtra = !recipeTags.has(tag);
    const isPreferred = customer.positiveTags.includes(tag);
    const isDisliked = customer.negativeTags.includes(tag);
    details.push({ tag, isExtra, isPreferred, isDisliked, isCancelled: false });
  }

  // Also show cancelled tags
  for (const tag of r.cancelledTags) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    const isExtra = !recipeTags.has(tag);
    const isDisliked = customer.negativeTags.includes(tag);
    details.push({ tag: `${tag}(抵消)`, isExtra, isPreferred: false, isDisliked, isCancelled: true });
  }

  return details;
}

function RareRecipeCard({ r, idx, customer, showRecipeProfit, isFavorite, onToggleFavorite }: {
  r: IRareRecipeResult;
  idx: number;
  customer: ICustomerRare;
  showRecipeProfit: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
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
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${RATING_COLORS[r.rating]}`}>{RATING_LABELS[r.rating]}</span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
              {r.recipe.cooker || '未知厨具'}
            </span>
            <button
              type="button"
              onClick={onToggleFavorite}
              className="ml-auto inline-flex items-center justify-center rounded p-0.5 text-amber-500 hover:bg-amber-100"
              aria-label={isFavorite ? '取消收藏菜品' : '收藏菜品'}
            >
              <Star className={`size-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="text-primary font-medium">¥{r.recipe.price}</span>
            {showRecipeProfit && <span>利润 ¥{profit}</span>}
            <span>得分 {r.foodScore}</span>
            {r.meetsRequiredFood && <span className="text-blue-600 font-medium">满足</span>}
          </div>
          {/* 原料 + 加料 */}
          <div className="flex gap-0.5 mt-0.5 flex-wrap">
            {r.recipe.ingredients.map((name) => (
              <span key={name} className="text-[10px] px-1 py-0 rounded bg-green-100 text-green-800 border border-green-200">{name}</span>
            ))}
            {r.extraIngredients.map((i) => {
              const reasonTags = r.extraIngredientReasonTags[i.id] ?? [];
              const reasonText = reasonTags.length > 0 ? `(${reasonTags.join(',')})` : '';
              return (
                <span key={i.id} className="text-[10px] px-1 py-0 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
                  +{i.name}{reasonText}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 悬浮Tag tooltip */}
      {showTags && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 p-2 rounded-lg border border-border bg-popover shadow-lg">
          <div className="flex flex-wrap gap-1">
            {tagDetails.map((td) => {
              let cls = 'bg-gray-100 text-gray-700 border-gray-200';
              if (td.isPreferred) cls = 'bg-pink-100 text-pink-800 border-pink-200';
              if (td.isDisliked) cls = 'bg-red-100 text-red-800 border-red-200';
              if (td.isCancelled) cls = 'bg-[#8B5E3C]/15 text-[#8B5E3C] border-[#8B5E3C]/40 line-through';
              return (
                <span key={td.tag} className={`text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>
                  {td.isExtra && '+'}{td.tag}{td.isDisliked && !td.isCancelled && ' ✕'}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
