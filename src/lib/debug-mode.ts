import allBeverages from '@/data/beverages.json';
import allIngredients from '@/data/ingredients.json';
import allRecipes from '@/data/recipes.json';
import type { TPlace } from '@/lib/types';

export interface DebugFlags {
  fakeSave: boolean;
  noTutorial: boolean;
}

export const DEBUG_DEFAULT_PLACE: TPlace = '人间之里';
export const GAME_STORE_STORAGE_KEY = 'mystia-steward-game-store';

const DEBUG_FAKE_SAVE_MARKER_KEY = 'mystia-steward-debug-fake-save-active';
const DEBUG_STORE_BACKUP_KEY = 'mystia-steward-debug-store-backup';
const EMPTY_BACKUP_SENTINEL = '__empty__';

function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in debug helpers.
  }
}

function safeStorageRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures in debug helpers.
  }
}

function buildAllFilter(items: Array<{ id: number }>) {
  const filter: Record<number, 'all'> = {};
  for (const item of items) {
    filter[item.id] = 'all';
  }
  return filter;
}

function buildOwnedIds(items: Array<{ id: number }>) {
  return items.map((item) => item.id);
}

function buildIngredientQty(items: Array<{ id: number }>) {
  const qty: Record<number, number> = {};
  for (const item of items) {
    qty[item.id] = 99;
  }
  return qty;
}

export function readDebugFlags(search = window.location.search): DebugFlags {
  const params = new URLSearchParams(search);
  return {
    fakeSave: params.get('fake_save') === 'true',
    noTutorial: params.get('no_tutorial') === 'true',
  };
}

export function createDebugFakeConfig() {
  return {
    recipeFilter: buildAllFilter(allRecipes as Array<{ id: number }>),
    beverageFilter: buildAllFilter(allBeverages as Array<{ id: number }>),
    ingredientFilter: buildAllFilter(allIngredients as Array<{ id: number }>),
    ownedRecipeIds: buildOwnedIds(allRecipes as Array<{ id: number }>),
    ownedBeverageIds: buildOwnedIds(allBeverages as Array<{ id: number }>),
    ownedIngredientIds: buildOwnedIds(allIngredients as Array<{ id: number }>),
    ownedIngredientQty: buildIngredientQty(allIngredients as Array<{ id: number }>),
    popularFoodTag: null,
    popularHateFoodTag: null,
    famousShopEnabled: false,
    rareRecipeFilterMode: 'exgood' as const,
    rareHideBelowScore: 3,
    rareHiddenCustomerIds: [],
    rareExtraCustomerIds: [],
    rareCustomerTags: {},
    rareDisabledIngredientIds: [],
    rareMaxExtraIngredients: 4,
    rareRecipePriceSort: 'desc' as const,
    rareBeveragePriceSort: 'desc' as const,
    rareFavoriteRecipesByCustomer: {},
    rareFavoriteBeverages: {},
    showRecipeProfit: false,
    rareEasterVisualEnabled: false,
  };
}

export function prepareFakeSaveDebugSession() {
  if (safeStorageGet(DEBUG_FAKE_SAVE_MARKER_KEY) === '1') {
    return;
  }

  const currentStore = safeStorageGet(GAME_STORE_STORAGE_KEY);
  safeStorageSet(DEBUG_STORE_BACKUP_KEY, currentStore ?? EMPTY_BACKUP_SENTINEL);
  safeStorageSet(DEBUG_FAKE_SAVE_MARKER_KEY, '1');
}

export function restoreStoreAfterDebugIfNeeded() {
  if (safeStorageGet(DEBUG_FAKE_SAVE_MARKER_KEY) !== '1') {
    return false;
  }

  const backup = safeStorageGet(DEBUG_STORE_BACKUP_KEY);
  if (backup === null || backup === EMPTY_BACKUP_SENTINEL) {
    safeStorageRemove(GAME_STORE_STORAGE_KEY);
  } else {
    safeStorageSet(GAME_STORE_STORAGE_KEY, backup);
  }

  safeStorageRemove(DEBUG_STORE_BACKUP_KEY);
  safeStorageRemove(DEBUG_FAKE_SAVE_MARKER_KEY);
  return true;
}