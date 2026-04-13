import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TPlace } from '@/lib/types';
import { parseSaveFile } from '@/lib/save-parser';

import allRecipes from '@/data/recipes.json';
import allBeverages from '@/data/beverages.json';
import allIngredients from '@/data/ingredients.json';

/**
 * Recipe/Beverage filter state:
 * - 'all': available for both normal and rare customers
 * - 'rare': available for rare customers only
 * - 'disabled': not available
 *
 * Items not in the map default to 'disabled'
 */
export type FilterState = 'all' | 'rare' | 'disabled';
export type PriceSortOrder = 'asc' | 'desc';

interface GameState {
  // === 通用设置 ===
  popularFoodTag: string | null;
  popularHateFoodTag: string | null;
  hideUnowned: boolean;
  guideAutoOpenDisabled: boolean;
  showRecipeProfit: boolean;

  // === 料理过滤 (3-state: all/rare/disabled) ===
  recipeFilter: Record<number, FilterState>;
  beverageFilter: Record<number, FilterState>;
  ingredientFilter: Record<number, FilterState>;

  // === 页面选择 ===
  normalSelectedPlace: TPlace | null;
  rareSelectedPlace: TPlace | null;
  rareHiddenCustomerIds: number[];
  rareHideBelowScore: number;
  rareMaxExtraIngredients: number;
  rareRecipePriceSort: PriceSortOrder;
  rareBeveragePriceSort: PriceSortOrder;
  rareFavoriteRecipesByCustomer: Record<string, number[]>;
  rareFavoriteBeverages: Record<string, number[]>;

  // === 稀客词条选择持久化（不分地区） ===
  rareCustomerTags: Record<number, { food: string | null; bev: string | null }>;

  // === 稀客食材 ===
  rareDisabledIngredientIds: number[];

  // === 存档数据 ===
  ownedRecipeIds: number[];
  ownedBeverageIds: number[];
  ownedIngredientIds: number[];
  ownedIngredientQty: Record<number, number>;

  // === Actions ===
  importSave: (jsonText: string) => void;
  importConfigData: (data: {
    recipeFilter: Record<number, string>;
    beverageFilter: Record<number, string>;
    ingredientFilter: Record<number, string>;
    ownedRecipeIds: number[];
    ownedBeverageIds: number[];
    ownedIngredientIds: number[];
    ownedIngredientQty: Record<number, number>;
    popularFoodTag: string | null;
    popularHateFoodTag: string | null;
    rareHideBelowScore?: number;
    rareHideNonPerfect?: boolean;
    rareHiddenCustomerIds: number[];
    rareCustomerTags: Record<number, { food: string | null; bev: string | null }>;
    rareDisabledIngredientIds: number[];
    rareMaxExtraIngredients?: number;
    rareRecipePriceSort?: PriceSortOrder;
    rareBeveragePriceSort?: PriceSortOrder;
    rareFavoriteRecipesByCustomer?: Record<string, number[]>;
    rareFavoriteBeverages?: Record<string, number[]>;
    showRecipeProfit?: boolean;
  }) => void;
  setPopularFoodTag: (tag: string | null) => void;
  setPopularHateFoodTag: (tag: string | null) => void;
  setHideUnowned: (v: boolean) => void;
  setGuideAutoOpenDisabled: (v: boolean) => void;
  setShowRecipeProfit: (v: boolean) => void;

  cycleRecipeFilter: (id: number) => void;
  cycleBeverageFilter: (id: number) => void;
  cycleIngredientFilter: (id: number) => void;
  setAllRecipes: (state: FilterState) => void;
  setAllBeverages: (state: FilterState) => void;
  setAllIngredients: (state: FilterState) => void;
  toggleRecipeOwnership: (id: number) => void;
  toggleBeverageOwnership: (id: number) => void;
  toggleIngredientOwnership: (id: number) => void;
  setIngredientQty: (id: number, qty: number) => void;
  setAllOwnedRecipes: (state: FilterState) => void;
  setAllOwnedBeverages: (state: FilterState) => void;
  setAllOwnedIngredients: (state: FilterState) => void;
  setIngredientsBelowQty: (qty: number, state: FilterState) => void;

  setNormalSelectedPlace: (place: TPlace | null) => void;
  setRareSelectedPlace: (place: TPlace | null) => void;
  toggleRareHiddenCustomer: (id: number) => void;
  setRareHiddenCustomerIds: (ids: number[]) => void;
  setRareHideBelowScore: (v: number) => void;
  setRareMaxExtraIngredients: (v: number) => void;
  toggleRareRecipePriceSort: () => void;
  toggleRareBeveragePriceSort: () => void;
  toggleRareFavoriteRecipe: (customerId: number, recipeId: number) => void;
  toggleRareFavoriteBeverage: (contextKey: string, beverageId: number) => void;
  toggleRareIngredient: (id: number) => void;
  setRareCustomerTag: (customerId: number, food: string | null, bev: string | null) => void;

  // Derived getters
  getNormalRecipeIds: () => number[];
  getRareRecipeIds: () => number[];
  getNormalBeverageIds: () => number[];
  getRareBeverageIds: () => number[];
  getRareIngredientIds: () => number[];
}

function cycleState(current: FilterState): FilterState {
  if (current === 'all') return 'rare';
  if (current === 'rare') return 'disabled';
  return 'all';
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      popularFoodTag: null,
      popularHateFoodTag: null,
      hideUnowned: true,
      guideAutoOpenDisabled: false,
      showRecipeProfit: false,
      recipeFilter: {},
      beverageFilter: {},
      ingredientFilter: {},
      normalSelectedPlace: null,
      rareSelectedPlace: null,
      rareHiddenCustomerIds: [],
      rareHideBelowScore: 3,
      rareMaxExtraIngredients: 4,
      rareRecipePriceSort: 'desc',
      rareBeveragePriceSort: 'desc',
      rareFavoriteRecipesByCustomer: {},
      rareFavoriteBeverages: {},
      rareCustomerTags: {},
      rareDisabledIngredientIds: [],
      ownedRecipeIds: [],
      ownedBeverageIds: [],
      ownedIngredientIds: [],
      ownedIngredientQty: {},

      importSave: (jsonText: string) => {
        const data = parseSaveFile(jsonText);

        // Convert save's recipeId values → our data's id values
        const recipeIdByGameId = new Map(
          (allRecipes as Array<{ id: number; recipeId: number }>).map((r) => [r.recipeId, r.id]),
        );
        const resolvedRecipeIds = data.recipeGameIds
          .map((gameId) => recipeIdByGameId.get(gameId))
          .filter((id): id is number => id !== undefined);

        const resolvedBeverageIds = [...data.beverages.keys()];

        const ownedIngredientQty: Record<number, number> = {};
        const ownedIngredientIds: number[] = [];
        for (const [id, qty] of data.ingredients) {
          ownedIngredientQty[id] = qty;
          ownedIngredientIds.push(id);
        }

        set((s) => {
          const prevOwnedRecipeSet = new Set(s.ownedRecipeIds);
          const prevOwnedBeverageSet = new Set(s.ownedBeverageIds);
          const prevOwnedIngredientSet = new Set(s.ownedIngredientIds);

          const ownedRecipeSet = new Set(resolvedRecipeIds);
          const ownedBeverageSet = new Set(resolvedBeverageIds);
          const ownedIngredientSet = new Set(ownedIngredientIds);

          const recipeFilter: Record<number, FilterState> = {};
          for (const r of allRecipes as Array<{ id: number }>) {
            const id = r.id;
            if (!ownedRecipeSet.has(id)) {
              recipeFilter[id] = 'disabled';
              continue;
            }
            const prev = s.recipeFilter[id] ?? 'all';
            const preserveModified = prevOwnedRecipeSet.has(id) && prev !== 'all';
            recipeFilter[id] = preserveModified ? prev : 'all';
          }

          const beverageFilter: Record<number, FilterState> = {};
          for (const b of allBeverages as Array<{ id: number }>) {
            const id = b.id;
            if (!ownedBeverageSet.has(id)) {
              beverageFilter[id] = 'disabled';
              continue;
            }
            const prev = s.beverageFilter[id] ?? 'all';
            const preserveModified = prevOwnedBeverageSet.has(id) && prev !== 'all';
            beverageFilter[id] = preserveModified ? prev : 'all';
          }

          const ingredientFilter: Record<number, FilterState> = {};
          for (const i of allIngredients as Array<{ id: number }>) {
            const id = i.id;
            if (!ownedIngredientSet.has(id)) {
              ingredientFilter[id] = 'disabled';
              continue;
            }
            const prev = s.ingredientFilter[id] ?? 'all';
            const preserveModified = prevOwnedIngredientSet.has(id) && prev !== 'all';
            ingredientFilter[id] = preserveModified ? prev : 'all';
          }

          return {
            ownedRecipeIds: resolvedRecipeIds,
            ownedBeverageIds: resolvedBeverageIds,
            ownedIngredientIds,
            ownedIngredientQty,
            recipeFilter,
            beverageFilter,
            ingredientFilter,
          };
        });
      },

      importConfigData: (data) => set({
        recipeFilter: data.recipeFilter as Record<number, FilterState>,
        beverageFilter: data.beverageFilter as Record<number, FilterState>,
        ingredientFilter: data.ingredientFilter as Record<number, FilterState>,
        ownedRecipeIds: data.ownedRecipeIds,
        ownedBeverageIds: data.ownedBeverageIds,
        ownedIngredientIds: data.ownedIngredientIds,
        ownedIngredientQty: data.ownedIngredientQty,
        popularFoodTag: data.popularFoodTag,
        popularHateFoodTag: data.popularHateFoodTag,
        rareHideBelowScore: Math.max(
          0,
          Math.min(
            3,
            data.rareHideBelowScore
              ?? (data.rareHideNonPerfect === false ? 0 : 3),
          ),
        ),
        rareMaxExtraIngredients: Math.max(0, Math.min(4, data.rareMaxExtraIngredients ?? 4)),
        rareRecipePriceSort: data.rareRecipePriceSort === 'asc' ? 'asc' : 'desc',
        rareBeveragePriceSort: data.rareBeveragePriceSort === 'asc' ? 'asc' : 'desc',
        rareFavoriteRecipesByCustomer: data.rareFavoriteRecipesByCustomer ?? {},
        rareFavoriteBeverages: data.rareFavoriteBeverages ?? {},
        showRecipeProfit: data.showRecipeProfit ?? false,
        rareHiddenCustomerIds: data.rareHiddenCustomerIds,
        rareCustomerTags: data.rareCustomerTags,
        rareDisabledIngredientIds: data.rareDisabledIngredientIds,
      }),

      setPopularFoodTag: (tag) => set({ popularFoodTag: tag }),
      setPopularHateFoodTag: (tag) => set({ popularHateFoodTag: tag }),
      setHideUnowned: (v) => set({ hideUnowned: v }),
      setGuideAutoOpenDisabled: (v) => set({ guideAutoOpenDisabled: v }),
      setShowRecipeProfit: (v) => set({ showRecipeProfit: v }),

      cycleRecipeFilter: (id) =>
        set((s) => ({
          recipeFilter: {
            ...s.recipeFilter,
            [id]: cycleState(s.recipeFilter[id] ?? 'disabled'),
          },
        })),

      cycleBeverageFilter: (id) =>
        set((s) => ({
          beverageFilter: {
            ...s.beverageFilter,
            [id]: cycleState(s.beverageFilter[id] ?? 'disabled'),
          },
        })),

      cycleIngredientFilter: (id) =>
        set((s) => ({
          ingredientFilter: {
            ...s.ingredientFilter,
            [id]: cycleState(s.ingredientFilter[id] ?? 'disabled'),
          },
        })),

      setAllRecipes: (state) =>
        set(() => {
          const filter: Record<number, FilterState> = {};
          for (const r of allRecipes as Array<{ id: number }>) filter[r.id] = state;
          return { recipeFilter: filter };
        }),

      setAllBeverages: (state) =>
        set(() => {
          const filter: Record<number, FilterState> = {};
          for (const b of allBeverages as Array<{ id: number }>) filter[b.id] = state;
          return { beverageFilter: filter };
        }),

      setAllIngredients: (state) =>
        set(() => {
          const filter: Record<number, FilterState> = {};
          for (const i of allIngredients as Array<{ id: number }>) filter[i.id] = state;
          return { ingredientFilter: filter };
        }),

      toggleRecipeOwnership: (id) =>
        set((s) => {
          const owned = new Set(s.ownedRecipeIds);
          const filter = { ...s.recipeFilter };
          if (owned.has(id)) {
            owned.delete(id);
            filter[id] = 'disabled';
          } else {
            owned.add(id);
            filter[id] = 'all';
          }
          return { ownedRecipeIds: [...owned], recipeFilter: filter };
        }),

      toggleBeverageOwnership: (id) =>
        set((s) => {
          const owned = new Set(s.ownedBeverageIds);
          const filter = { ...s.beverageFilter };
          if (owned.has(id)) {
            owned.delete(id);
            filter[id] = 'disabled';
          } else {
            owned.add(id);
            filter[id] = 'all';
          }
          return { ownedBeverageIds: [...owned], beverageFilter: filter };
        }),

      toggleIngredientOwnership: (id) =>
        set((s) => {
          const owned = new Set(s.ownedIngredientIds);
          const filter = { ...s.ingredientFilter };
          const qty = { ...s.ownedIngredientQty };
          if (owned.has(id)) {
            owned.delete(id);
            filter[id] = 'disabled';
            delete qty[id];
          } else {
            owned.add(id);
            filter[id] = 'all';
            qty[id] = 1;
          }
          return { ownedIngredientIds: [...owned], ingredientFilter: filter, ownedIngredientQty: qty };
        }),

      setIngredientQty: (id, nextQty) =>
        set((s) => {
          if (!s.ownedIngredientIds.includes(id)) return s;
          const qty = Number.isFinite(nextQty) ? Math.max(0, Math.floor(nextQty)) : 0;
          return {
            ownedIngredientQty: {
              ...s.ownedIngredientQty,
              [id]: qty,
            },
          };
        }),

      setAllOwnedRecipes: (state) =>
        set((s) => {
          const filter = { ...s.recipeFilter };
          for (const id of s.ownedRecipeIds) filter[id] = state;
          return { recipeFilter: filter };
        }),

      setAllOwnedBeverages: (state) =>
        set((s) => {
          const filter = { ...s.beverageFilter };
          for (const id of s.ownedBeverageIds) filter[id] = state;
          return { beverageFilter: filter };
        }),

      setAllOwnedIngredients: (state) =>
        set((s) => {
          const filter = { ...s.ingredientFilter };
          for (const id of s.ownedIngredientIds) filter[id] = state;
          return { ingredientFilter: filter };
        }),

      setIngredientsBelowQty: (qty, state) =>
        set((s) => {
          const filter = { ...s.ingredientFilter };
          for (const id of s.ownedIngredientIds) {
            const owned = s.ownedIngredientQty[id] ?? 0;
            if (owned < qty) filter[id] = state;
          }
          // 未取得食材强制禁用，避免错误参与推荐
          const ownedSet = new Set(s.ownedIngredientIds);
          for (const ing of allIngredients as Array<{ id: number }>) {
            if (!ownedSet.has(ing.id)) filter[ing.id] = 'disabled';
          }
          return { ingredientFilter: filter };
        }),

      setNormalSelectedPlace: (place) => set({ normalSelectedPlace: place }),
      setRareSelectedPlace: (place) => set({ rareSelectedPlace: place }),

      toggleRareHiddenCustomer: (id) =>
        set((s) => ({
          rareHiddenCustomerIds: s.rareHiddenCustomerIds.includes(id)
            ? s.rareHiddenCustomerIds.filter((i) => i !== id)
            : [...s.rareHiddenCustomerIds, id],
        })),
      setRareHiddenCustomerIds: (ids) => set({ rareHiddenCustomerIds: ids }),
      setRareHideBelowScore: (v) => set({ rareHideBelowScore: Math.max(0, Math.min(3, v)) }),
      setRareMaxExtraIngredients: (v) => set({ rareMaxExtraIngredients: Math.max(0, Math.min(4, v)) }),
      toggleRareRecipePriceSort: () =>
        set((s) => ({
          rareRecipePriceSort: s.rareRecipePriceSort === 'asc' ? 'desc' : 'asc',
        })),
      toggleRareBeveragePriceSort: () =>
        set((s) => ({
          rareBeveragePriceSort: s.rareBeveragePriceSort === 'asc' ? 'desc' : 'asc',
        })),
      toggleRareFavoriteRecipe: (customerId, recipeId) =>
        set((s) => {
          const customerKey = String(customerId);
          const current = s.rareFavoriteRecipesByCustomer[customerKey] ?? [];
          const next = current.includes(recipeId)
            ? current.filter((id) => id !== recipeId)
            : [recipeId, ...current];
          return {
            rareFavoriteRecipesByCustomer: {
              ...s.rareFavoriteRecipesByCustomer,
              [customerKey]: next,
            },
          };
        }),
      toggleRareFavoriteBeverage: (contextKey, beverageId) =>
        set((s) => {
          const current = s.rareFavoriteBeverages[contextKey] ?? [];
          const next = current.includes(beverageId)
            ? current.filter((id) => id !== beverageId)
            : [beverageId, ...current];
          return {
            rareFavoriteBeverages: {
              ...s.rareFavoriteBeverages,
              [contextKey]: next,
            },
          };
        }),

      setRareCustomerTag: (customerId, food, bev) =>
        set((s) => ({
          rareCustomerTags: {
            ...s.rareCustomerTags,
            [customerId]: { food, bev },
          },
        })),

      toggleRareIngredient: (id) =>
        set((s) => ({
          rareDisabledIngredientIds: s.rareDisabledIngredientIds.includes(id)
            ? s.rareDisabledIngredientIds.filter((i) => i !== id)
            : [...s.rareDisabledIngredientIds, id],
        })),

      // Derived: get recipe/beverage IDs by filter state
      getNormalRecipeIds: () => {
        const { recipeFilter } = get();
        return Object.entries(recipeFilter)
          .filter(([, state]) => state === 'all')
          .map(([id]) => Number(id));
      },
      getRareRecipeIds: () => {
        const { recipeFilter } = get();
        return Object.entries(recipeFilter)
          .filter(([, state]) => state === 'all' || state === 'rare')
          .map(([id]) => Number(id));
      },
      getNormalBeverageIds: () => {
        const { beverageFilter } = get();
        return Object.entries(beverageFilter)
          .filter(([, state]) => state === 'all')
          .map(([id]) => Number(id));
      },
      getRareBeverageIds: () => {
        const { beverageFilter } = get();
        return Object.entries(beverageFilter)
          .filter(([, state]) => state === 'all' || state === 'rare')
          .map(([id]) => Number(id));
      },
      getRareIngredientIds: () => {
        const { ingredientFilter, ownedIngredientIds } = get();
        const ownedSet = new Set(ownedIngredientIds);
        return Object.entries(ingredientFilter)
          .filter(([id, state]) => (state === 'all' || state === 'rare') && ownedSet.has(Number(id)))
          .map(([id]) => Number(id));
      },
    }),
    { name: 'mystia-steward-game-store' },
  ),
);
