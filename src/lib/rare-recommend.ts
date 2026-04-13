/**
 * 稀客推荐算法：组合搜索料理加料方案
 */
import type {
  IRecipe,
  IIngredient,
  IBeverage,
  ICustomerRare,
  IRareRecipeResult,
  IRareBeverageResult,
  TPlace,
} from '@/lib/types';
import {
  resolveTagConflicts,
  getDynamicTags,
  hasForbiddenTag,
  mergeAllTags,
  scoreFoodForRare,
  getRating,
  canCancelNegativeByConflict,
  countConflictCancellations,
} from '@/lib/tags';

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

// 特殊规则：古明地恋点单时，无意识妖怪慕斯强制判定为极差。
const KOISHI_CUSTOMER_ID = 2006;
const KOISHI_FORCED_EXBAD_RECIPE_ID = 70;

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

interface IngredientTagReasonResult {
  reasonTagsByIngredient: Record<number, string[]>;
  assignedBaseReuseScore: number;
  assignedQtyScore: number;
  assignedPriceScore: number;
}

function getIngredientOwnedQty(
  ingredientId: number,
  ownedIngredientQty: Record<number, number>,
): number {
  return ownedIngredientQty[ingredientId] ?? 0;
}

function compareIngredientByOwnedThenPrice(
  a: IIngredient,
  b: IIngredient,
  ownedIngredientQty: Record<number, number>,
): number {
  const aQty = getIngredientOwnedQty(a.id, ownedIngredientQty);
  const bQty = getIngredientOwnedQty(b.id, ownedIngredientQty);
  if (aQty !== bQty) return bQty - aQty;
  if (a.price !== b.price) return a.price - b.price;
  return a.id - b.id;
}

function buildExtraIngredientTagReasons(
  selectedIngredients: IIngredient[],
  baseActiveTags: string[],
  finalActiveTags: string[],
  customerPreferredTags: string[],
  requiredFoodTag: string,
  baseIngredientNames: Set<string>,
  ownedIngredientQty: Record<number, number>,
): IngredientTagReasonResult {
  const reasonTagsByIngredient: Record<number, string[]> = {};
  const neededTags: string[] = [];

  if (!baseActiveTags.includes(requiredFoodTag) && finalActiveTags.includes(requiredFoodTag)) {
    neededTags.push(requiredFoodTag);
  }

  for (const tag of customerPreferredTags) {
    if (tag === requiredFoodTag) continue;
    if (!baseActiveTags.includes(tag) && finalActiveTags.includes(tag)) {
      neededTags.push(tag);
    }
  }

  let assignedBaseReuseScore = 0;
  let assignedQtyScore = 0;
  let assignedPriceScore = 0;

  for (const tag of neededTags) {
    const carriers = selectedIngredients
      .filter((ingredient) => ingredient.tags.includes(tag))
      .sort((a, b) => {
        const aBaseReuse = baseIngredientNames.has(a.name) ? 1 : 0;
        const bBaseReuse = baseIngredientNames.has(b.name) ? 1 : 0;
        if (aBaseReuse !== bBaseReuse) return bBaseReuse - aBaseReuse;
        return compareIngredientByOwnedThenPrice(a, b, ownedIngredientQty);
      });

    if (carriers.length === 0) continue;
    const chosen = carriers[0];
    if (!reasonTagsByIngredient[chosen.id]) reasonTagsByIngredient[chosen.id] = [];
    reasonTagsByIngredient[chosen.id].push(tag);
    if (baseIngredientNames.has(chosen.name)) assignedBaseReuseScore++;
    assignedQtyScore += getIngredientOwnedQty(chosen.id, ownedIngredientQty);
    assignedPriceScore += chosen.price;
  }

  return {
    reasonTagsByIngredient,
    assignedBaseReuseScore,
    assignedQtyScore,
    assignedPriceScore,
  };
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

/** 稀客料理推荐 */
export function rankRecipesForRare(
  customer: ICustomerRare,
  requiredFoodTag: string,
  _requiredBevTag: string,
  availableRecipeIds: Set<number>,
  availableIngredientIds: Set<number>,
  disabledIngredientIds: Set<number>,
  popularFoodTag: string | null,
  popularHateFoodTag: string | null,
  ownedIngredientQty: Record<number, number> = {},
): IRareRecipeResult[] {
  const results: IRareRecipeResult[] = [];

  // 实现细节：默认用户酒水满足1个条件（+1 且满足点单），
  // 因此料理仅追求3分即可，超过3分不再产生额外收益。
  const ASSUMED_BEV_SCORE = 1;
  const ASSUMED_BEV_MEETS = true;
  const FOOD_SCORE_CAP = 3;
  const minFoodScore = FOOD_SCORE_CAP;

  // 构建可用食材列表
  const usableIngredients: IIngredient[] = [];
  for (const id of availableIngredientIds) {
    if (disabledIngredientIds.has(id)) continue;
    const ing = ingredientsById.get(id);
    if (!ing) continue;
    usableIngredients.push(ing);
  }

  // 预计算客人喜好tag集合（用于筛选候选食材）
  const customerPreferredTagSet = new Set(customer.positiveTags);
  const MAX_CANDIDATES = 18;

  for (const recipe of allRecipes as IRecipe[]) {
    if (!availableRecipeIds.has(recipe.id)) continue;
    const isKoishiForcedExBad =
      customer.id === KOISHI_CUSTOMER_ID && recipe.id === KOISHI_FORCED_EXBAD_RECIPE_ID;

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

    // 筛选此料理可用的候选食材
    const allCandidates = usableIngredients.filter(
      (ing) => !hasForbiddenTag(ing.tags, recipe.negativeTags),
    );

    // === 性能优化：仅保留相关候选并限制数量 ===
    // 相关定义：
    // 1) 可匹配点单Tag/顾客喜好Tag
    // 2) 可通过互斥规则抵消当前已激活的顾客厌恶Tag
    const relevant: IIngredient[] = [];
    for (const c of allCandidates) {
      const matchesPreferredOrRequired = c.tags.some((t) => customerPreferredTagSet.has(t) || t === requiredFoodTag);
      const canCancelNegative = canCancelNegativeByConflict(
        baseActiveTags,
        c.tags,
        customer.negativeTags,
      );
      if (matchesPreferredOrRequired || canCancelNegative) {
        relevant.push(c);
      }
    }

    // 按相关性排序：点单Tag > 喜好Tag匹配 > 厌恶Tag相消。
    // 在相关性相同的情况下，优先选择持有数更高的食材；再同则价格更低。
    const baseIngNames = new Set(recipe.ingredients);
    const candidateComparator = (a: IIngredient, b: IIngredient) => {
      const aRequiredHit = a.tags.includes(requiredFoodTag) ? 1 : 0;
      const bRequiredHit = b.tags.includes(requiredFoodTag) ? 1 : 0;
      if (aRequiredHit !== bRequiredHit) return bRequiredHit - aRequiredHit;

      const aPreferredHits = a.tags.filter((t) => customerPreferredTagSet.has(t)).length;
      const bPreferredHits = b.tags.filter((t) => customerPreferredTagSet.has(t)).length;
      if (aPreferredHits !== bPreferredHits) return bPreferredHits - aPreferredHits;

      const aCancelHits = countConflictCancellations(baseActiveTags, a.tags, customer.negativeTags);
      const bCancelHits = countConflictCancellations(baseActiveTags, b.tags, customer.negativeTags);
      if (aCancelHits !== bCancelHits) return bCancelHits - aCancelHits;

      const aBaseReuse = baseIngNames.has(a.name) ? 1 : 0;
      const bBaseReuse = baseIngNames.has(b.name) ? 1 : 0;
      if (aBaseReuse !== bBaseReuse) return bBaseReuse - aBaseReuse;

      return compareIngredientByOwnedThenPrice(a, b, ownedIngredientQty);
    };

    const candidates = [...relevant]
      .sort(candidateComparator)
      .slice(0, MAX_CANDIDATES);

    // Step b: 组合搜索加料方案（以最少加料为先，再按库存优先）
    let bestCombo: IIngredient[] | null = null;
    let bestEval = evaluateCombo(recipe, [], customer, requiredFoodTag, popularFoodTag, popularHateFoodTag);
    let bestReasonData: IngredientTagReasonResult = {
      reasonTagsByIngredient: {},
      assignedBaseReuseScore: 0,
      assignedQtyScore: 0,
      assignedPriceScore: 0,
    };

    // 先评估不加料的情况
    const baseEval = bestEval;

    if (
      baseEval.foodScore >= minFoodScore &&
      baseEval.meetsRequiredFood
    ) {
      bestCombo = [];
    } else if (extraSlots > 0) {
      const n = candidates.length;

      outer: for (let k = 1; k <= Math.min(extraSlots, n); k++) {
        let bestComboForK: IIngredient[] | null = null;
        let bestEvalForK: ReturnType<typeof evaluateCombo> | null = null;
        let bestReasonForK: IngredientTagReasonResult | null = null;
        let bestCostForK = Infinity;
        const indices = Array.from({ length: k }, (_, i) => i);
        while (true) {
          const combo = indices.map((i) => candidates[i]);
          const ev = evaluateCombo(recipe, combo, customer, requiredFoodTag, popularFoodTag, popularHateFoodTag);
          if (ev.foodScore >= minFoodScore && ev.meetsRequiredFood) {
            const cost = combo.reduce((sum, ingredient) => sum + ingredient.price, 0);
            const reasonData = buildExtraIngredientTagReasons(
              combo,
              baseEval.activeTags,
              ev.activeTags,
              customer.positiveTags,
              requiredFoodTag,
              baseIngNames,
              ownedIngredientQty,
            );

            const shouldReplace =
              bestComboForK === null ||
              reasonData.assignedBaseReuseScore > (bestReasonForK?.assignedBaseReuseScore ?? -1) ||
              (reasonData.assignedBaseReuseScore === (bestReasonForK?.assignedBaseReuseScore ?? -1) &&
                reasonData.assignedQtyScore > (bestReasonForK?.assignedQtyScore ?? -1)) ||
              (reasonData.assignedBaseReuseScore === (bestReasonForK?.assignedBaseReuseScore ?? -1) &&
                reasonData.assignedQtyScore === (bestReasonForK?.assignedQtyScore ?? -1) &&
                reasonData.assignedPriceScore < (bestReasonForK?.assignedPriceScore ?? Infinity)) ||
              (reasonData.assignedBaseReuseScore === (bestReasonForK?.assignedBaseReuseScore ?? -1) &&
                reasonData.assignedQtyScore === (bestReasonForK?.assignedQtyScore ?? -1) &&
                reasonData.assignedPriceScore === (bestReasonForK?.assignedPriceScore ?? Infinity) &&
                cost < bestCostForK);

            if (shouldReplace) {
              bestComboForK = combo;
              bestEvalForK = ev;
              bestReasonForK = reasonData;
              bestCostForK = cost;
            }
          }

          // 下一个组合
          let i = k - 1;
          while (i >= 0 && indices[i] === n - k + i) i--;
          if (i < 0) break;
          indices[i]++;
          for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
        }

        if (bestComboForK !== null && bestEvalForK && bestReasonForK) {
          bestCombo = bestComboForK;
          bestEval = bestEvalForK;
          bestReasonData = bestReasonForK;
          break outer;
        }
      }
    }

    // 计算最终结果
    const selectedIngredients = bestCombo ?? [];
    const finalEval = bestCombo !== null ? bestEval : baseEval;
    const effectiveFoodScore = Math.min(finalEval.foodScore, FOOD_SCORE_CAP);

    const extraIngredientReasonTags = selectedIngredients.length > 0
      ? bestReasonData.reasonTagsByIngredient
      : {};

    let finalFoodScore = effectiveFoodScore;
    let finalMeetsRequiredFood = finalEval.meetsRequiredFood;
    let rating = getRating(finalFoodScore, ASSUMED_BEV_SCORE, finalMeetsRequiredFood, ASSUMED_BEV_MEETS);

    if (isKoishiForcedExBad) {
      finalFoodScore = 0;
      finalMeetsRequiredFood = false;
      rating = 'ExBad';
    }

    const baseCost = recipe.ingredients.reduce((sum, name) => {
      const ing = ingredientsByName.get(name);
      return sum + (ing ? ing.price : 0);
    }, 0);
    const extraCost = selectedIngredients.reduce((sum, i) => sum + i.price, 0);

    results.push({
      recipe,
      extraIngredients: selectedIngredients,
      extraIngredientReasonTags,
      allTags: finalEval.activeTags,
      cancelledTags: finalEval.cancelledTags,
      foodScore: finalFoodScore,
      meetsRequiredFood: finalMeetsRequiredFood,
      rating,
      baseCost,
      extraCost,
    });
  }

  // Step c: 排序 —— ExGood优先，然后按价格降序
  results.sort((a, b) => {
    const aPerfect = a.rating === 'ExGood' ? 0 : 1;
    const bPerfect = b.rating === 'ExGood' ? 0 : 1;
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
