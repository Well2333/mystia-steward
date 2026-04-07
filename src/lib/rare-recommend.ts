/**
 * 稀客推荐算法：排列组合搜索最低成本极佳方案
 */
import type {
  IRecipe,
  IIngredient,
  IBeverage,
  ICustomerRare,
  IRareRecipeResult,
  IRareBeverageResult,
  TPlace,
} from './types';
import {
  resolveTagConflicts,
  getDynamicTags,
  hasForbiddenTag,
  mergeAllTags,
  scoreFoodForRare,
  getRating,
  canCancelNegativeByConflict,
  countConflictCancellations,
} from './tags';

import allRecipes from '@/data/recipes.json';
import allIngredients from '@/data/ingredients.json';
import allBeverages from '@/data/beverages.json';
import allRareCustomers from '@/data/customer_rare.json';

const ingredientsByName = new Map(
  (allIngredients as IIngredient[]).map((i) => [i.name, i]),
);
const ingredientsById = new Map(
  (allIngredients as IIngredient[]).map((i) => [i.id, i]),
);

/** 获取指定地区的稀客 */
export function getRareCustomersByPlace(place: TPlace): ICustomerRare[] {
  return (allRareCustomers as unknown as ICustomerRare[]).filter((c) =>
    c.places.includes(place),
  );
}

/** 获取全部稀客 */
export function getAllRareCustomers(): ICustomerRare[] {
  return allRareCustomers as unknown as ICustomerRare[];
}

/** 评估一组额外食材的食物得分与是否满足点单 */
function evaluateCombo(
  recipe: IRecipe,
  extraIngredients: IIngredient[],
  customer: ICustomerRare,
  requiredFoodTag: string,
  popularFoodTag: string | null,
  popularHateFoodTag: string | null,
): { foodScore: number; meetsRequiredFood: boolean; activeTags: string[]; cancelledTags: string[] } {
  const totalIngCount = recipe.ingredients.length + extraIngredients.length;
  const baseTags = new Set(recipe.positiveTags);
  for (const ing of extraIngredients) {
    for (const t of ing.tags) baseTags.add(t);
  }
  const dynamicTags = getDynamicTags(
    recipe.price,
    totalIngCount,
    popularFoodTag,
    popularHateFoodTag,
    [...baseTags],
  );
  const allTags = mergeAllTags(
    recipe.positiveTags,
    extraIngredients.map((i) => i.tags),
    dynamicTags,
  );
  const { activeTags, cancelledTags } = resolveTagConflicts(allTags);
  const foodScore = scoreFoodForRare(activeTags, customer.positiveTags, customer.negativeTags);
  const meetsRequiredFood = activeTags.includes(requiredFoodTag);
  return { foodScore, meetsRequiredFood, activeTags, cancelledTags };
}

/** 稀客菜谱推荐 */
export function rankRecipesForRare(
  customer: ICustomerRare,
  requiredFoodTag: string,
  _requiredBevTag: string,
  availableRecipeIds: Set<number>,
  availableIngredientIds: Set<number>,
  disabledIngredientIds: Set<number>,
  popularFoodTag: string | null,
  popularHateFoodTag: string | null,
  topBevScore: number,
  topBevMeets: boolean,
): IRareRecipeResult[] {
  const results: IRareRecipeResult[] = [];

  // 极佳所需最低食物得分
  const minFoodScore = topBevMeets ? Math.max(0, 4 - topBevScore) : Infinity;

  // 构建可用食材列表
  const usableIngredients: IIngredient[] = [];
  for (const id of availableIngredientIds) {
    if (disabledIngredientIds.has(id)) continue;
    const ing = ingredientsById.get(id);
    if (!ing) continue;
    usableIngredients.push(ing);
  }

  // 预计算客人正面tag集合（用于筛选候选食材）
  const customerPosTagSet = new Set(customer.positiveTags);
  const MAX_CANDIDATES = 18;

  for (const recipe of allRecipes as IRecipe[]) {
    if (!availableRecipeIds.has(recipe.id)) continue;

    // 基础食材可用性检查：必须在可用食材列表中，且未被禁用
    const hasUnavailableBaseIngredient = recipe.ingredients.some((name) => {
      const ing = ingredientsByName.get(name);
      if (!ing) return true;
      if (!availableIngredientIds.has(ing.id)) return true;
      return disabledIngredientIds.has(ing.id);
    });
    if (hasUnavailableBaseIngredient) continue;

    const extraSlots = 5 - recipe.ingredients.length;

    const baseDynamicTags = getDynamicTags(
      recipe.price,
      recipe.ingredients.length,
      popularFoodTag,
      popularHateFoodTag,
      recipe.positiveTags,
    );
    const baseAllTags = mergeAllTags(recipe.positiveTags, [], baseDynamicTags);
    const { activeTags: baseActiveTags } = resolveTagConflicts(baseAllTags);

    // 筛选此菜谱可用的候选食材
    const baseIngNames = new Set(recipe.ingredients);
    const allCandidates = usableIngredients.filter(
      (ing) =>
        !hasForbiddenTag(ing.tags, recipe.negativeTags) &&
        !baseIngNames.has(ing.name),
    );

    // === 性能优化：仅保留相关候选并限制数量 ===
    // 相关定义：
    // 1) 可匹配点单Tag/顾客喜好Tag
    // 2) 可通过互斥规则抵消当前已激活的顾客负面Tag
    const relevant: IIngredient[] = [];
    for (const c of allCandidates) {
      const matchesPositiveOrRequired = c.tags.some((t) => customerPosTagSet.has(t) || t === requiredFoodTag);
      const canCancelNegative = canCancelNegativeByConflict(
        baseActiveTags,
        c.tags,
        customer.negativeTags,
      );
      if (matchesPositiveOrRequired || canCancelNegative) {
        relevant.push(c);
      }
    }

    let candidates: IIngredient[];
    if (relevant.length > MAX_CANDIDATES) {
      // 按相关性降序：点单Tag > 正面Tag匹配 > 负面Tag相消，同数则价格升序
      relevant.sort((a, b) => {
        const aRequiredHit = a.tags.includes(requiredFoodTag) ? 1 : 0;
        const bRequiredHit = b.tags.includes(requiredFoodTag) ? 1 : 0;
        if (aRequiredHit !== bRequiredHit) return bRequiredHit - aRequiredHit;

        const aPositiveHits = a.tags.filter((t) => customerPosTagSet.has(t)).length;
        const bPositiveHits = b.tags.filter((t) => customerPosTagSet.has(t)).length;
        if (aPositiveHits !== bPositiveHits) return bPositiveHits - aPositiveHits;

        const aCancelHits = countConflictCancellations(baseActiveTags, a.tags, customer.negativeTags);
        const bCancelHits = countConflictCancellations(baseActiveTags, b.tags, customer.negativeTags);
        if (aCancelHits !== bCancelHits) return bCancelHits - aCancelHits;

        return a.price - b.price;
      });
      candidates = relevant.slice(0, MAX_CANDIDATES);
    } else {
      candidates = relevant;
    }

    candidates.sort((a, b) => a.price - b.price);

    // Step b: 排列组合搜索最低成本达成极佳的方案
    let bestCombo: IIngredient[] | null = null;
    let bestCost = Infinity;

    // 先评估不加料的情况
    const baseEval = evaluateCombo(recipe, [], customer, requiredFoodTag, popularFoodTag, popularHateFoodTag);

    if (
      minFoodScore !== Infinity &&
      baseEval.foodScore >= minFoodScore &&
      baseEval.meetsRequiredFood
    ) {
      bestCombo = [];
      bestCost = 0;
    } else if (extraSlots > 0 && minFoodScore !== Infinity) {
      const n = candidates.length;
      // 预计算候选食材的累积最低价格（用于剪枝）
      const minPrices = candidates.map((c) => c.price);

      outer: for (let k = 1; k <= Math.min(extraSlots, n); k++) {
        // 剪枝：k 个最便宜的候选总价 >= bestCost 则跳过
        let cheapestK = 0;
        for (let ci = 0; ci < k; ci++) cheapestK += minPrices[ci];
        if (cheapestK >= bestCost) break outer;

        const indices = Array.from({ length: k }, (_, i) => i);
        while (true) {
          // 快速计算组合成本（利用已排序候选提前剪枝）
          let cost = 0;
          let tooExpensive = false;
          for (let ci = 0; ci < k; ci++) {
            cost += candidates[indices[ci]].price;
            if (cost >= bestCost) { tooExpensive = true; break; }
          }

          if (!tooExpensive) {
            const combo = indices.map((i) => candidates[i]);
            const ev = evaluateCombo(recipe, combo, customer, requiredFoodTag, popularFoodTag, popularHateFoodTag);
            if (ev.foodScore >= minFoodScore && ev.meetsRequiredFood) {
              bestCombo = combo;
              bestCost = cost;
            }
          }

          // 下一个组合
          let i = k - 1;
          while (i >= 0 && indices[i] === n - k + i) i--;
          if (i < 0) break;
          indices[i]++;
          for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
        }
        if (bestCombo !== null) break outer;
      }
    }

    // 计算最终结果
    const selectedIngredients = bestCombo ?? [];
    const finalEval = bestCombo !== null
      ? evaluateCombo(recipe, selectedIngredients, customer, requiredFoodTag, popularFoodTag, popularHateFoodTag)
      : baseEval;

    const rating = getRating(finalEval.foodScore, topBevScore, finalEval.meetsRequiredFood, topBevMeets);

    const baseCost = recipe.ingredients.reduce((sum, name) => {
      const ing = ingredientsByName.get(name);
      return sum + (ing ? ing.price : 0);
    }, 0);
    const extraCost = selectedIngredients.reduce((sum, i) => sum + i.price, 0);

    results.push({
      recipe,
      extraIngredients: selectedIngredients,
      allTags: finalEval.activeTags,
      cancelledTags: finalEval.cancelledTags,
      foodScore: finalEval.foodScore,
      meetsRequiredFood: finalEval.meetsRequiredFood,
      rating,
      baseCost,
      extraCost,
    });
  }

  // Step c: 排序 —— 极佳优先，然后按价格降序
  results.sort((a, b) => {
    const aPerfect = a.rating === '极佳' ? 0 : 1;
    const bPerfect = b.rating === '极佳' ? 0 : 1;
    if (aPerfect !== bPerfect) return aPerfect - bPerfect;
    return b.recipe.price - a.recipe.price;
  });

  return results;
}

/** 稀客酒水推荐 */
export function rankBeveragesForRare(
  customer: ICustomerRare,
  requiredBevTag: string,
  availableBeverageIds: Set<number>,
): IRareBeverageResult[] {
  const results: IRareBeverageResult[] = [];

  for (const bev of allBeverages as IBeverage[]) {
    if (!availableBeverageIds.has(bev.id)) continue;

    const matchedTags = bev.tags.filter((t) =>
      customer.beverageTags.includes(t),
    );
    const bevScore = matchedTags.length;
    const meetsRequiredBev = bev.tags.includes(requiredBevTag);

    results.push({ beverage: bev, bevScore, meetsRequiredBev, matchedTags });
  }

  results.sort((a, b) => {
    if (a.meetsRequiredBev !== b.meetsRequiredBev)
      return a.meetsRequiredBev ? -1 : 1;
    return b.beverage.price - a.beverage.price;
  });

  return results;
}
