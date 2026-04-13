/**
 * 配置导入/导出工具
 * 使用 lz-string 压缩 JSON，生成适合剪贴板复制的短字符串
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

const CONFIG_VERSION = 5;
const MAGIC_PREFIX = 'IZK'; // 用于识别配置字符串

export interface ExportableConfig {
  v: number;
  // Filters
  rf: Record<string, string>; // recipeFilter (id→state shorthand)
  bf: Record<string, string>; // beverageFilter
  if: Record<string, string>; // ingredientFilter
  // Owned
  or: number[];  // ownedRecipeIds
  ob: number[];  // ownedBeverageIds
  oi: number[];  // ownedIngredientIds
  oq: Record<string, number>; // ownedIngredientQty
  // Settings
  pf: string | null;  // popularFoodTag
  ph: string | null;  // popularHateFoodTag
  hs?: number;        // rareHideBelowScore (v5)
  hn?: boolean;       // rareHideNonPerfect (legacy <= v4)
  mx: number;         // rareMaxExtraIngredients
  rs: 'asc' | 'desc'; // rareRecipePriceSort
  bs: 'asc' | 'desc'; // rareBeveragePriceSort
  hc: number[];       // rareHiddenCustomerIds
  ct: Record<string, { f: string | null; b: string | null }>; // rareCustomerTags (compressed)
  di: number[];       // rareDisabledIngredientIds
  fr: Record<string, number[]> | number[] | Record<string, string[]>; // rareFavoriteRecipesByCustomer (legacy supports array/map)
  fb: Record<string, number[]>; // rareFavoriteBeverages
  sp?: boolean;      // showRecipeProfit
}

/** Shorten filter state: 'all'→'a', 'rare'→'r', 'disabled'→'d' */
function shortenFilter(filter: Record<number, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(filter)) {
    out[k] = v === 'all' ? 'a' : v === 'rare' ? 'r' : 'd';
  }
  return out;
}

/** Expand shortened filter state */
function expandFilter(filter: Record<string, string>): Record<number, string> {
  const out: Record<number, string> = {};
  for (const [k, v] of Object.entries(filter)) {
    out[Number(k)] = v === 'a' ? 'all' : v === 'r' ? 'rare' : 'disabled';
  }
  return out;
}

/** Export store state to a compressed string */
export function exportConfig(state: {
  recipeFilter: Record<number, string>;
  beverageFilter: Record<number, string>;
  ingredientFilter: Record<number, string>;
  ownedRecipeIds: number[];
  ownedBeverageIds: number[];
  ownedIngredientIds: number[];
  ownedIngredientQty: Record<number, number>;
  popularFoodTag: string | null;
  popularHateFoodTag: string | null;
  rareHideBelowScore: number;
  rareMaxExtraIngredients: number;
  rareRecipePriceSort: 'asc' | 'desc';
  rareBeveragePriceSort: 'asc' | 'desc';
  rareHiddenCustomerIds: number[];
  rareCustomerTags: Record<number, { food: string | null; bev: string | null }>;
  rareDisabledIngredientIds: number[];
  rareFavoriteRecipesByCustomer: Record<string, number[]>;
  rareFavoriteBeverages: Record<string, number[]>;
  showRecipeProfit: boolean;
}): string {
  const ct: Record<string, { f: string | null; b: string | null }> = {};
  for (const [k, v] of Object.entries(state.rareCustomerTags)) {
    ct[k] = { f: v.food, b: v.bev };
  }

  const config: ExportableConfig = {
    v: CONFIG_VERSION,
    rf: shortenFilter(state.recipeFilter),
    bf: shortenFilter(state.beverageFilter),
    if: shortenFilter(state.ingredientFilter),
    or: state.ownedRecipeIds,
    ob: state.ownedBeverageIds,
    oi: state.ownedIngredientIds,
    oq: state.ownedIngredientQty as Record<string, number>,
    pf: state.popularFoodTag,
    ph: state.popularHateFoodTag,
    hs: Math.max(0, Math.min(3, state.rareHideBelowScore)),
    mx: state.rareMaxExtraIngredients,
    rs: state.rareRecipePriceSort,
    bs: state.rareBeveragePriceSort,
    hc: state.rareHiddenCustomerIds,
    ct,
    di: state.rareDisabledIngredientIds,
    fr: state.rareFavoriteRecipesByCustomer,
    fb: state.rareFavoriteBeverages,
    sp: state.showRecipeProfit,
  };

  const json = JSON.stringify(config);
  const compressed = compressToEncodedURIComponent(json);
  return MAGIC_PREFIX + compressed;
}

/** Import config from a compressed string. Throws on invalid input. */
export function importConfig(str: string): {
  recipeFilter: Record<number, string>;
  beverageFilter: Record<number, string>;
  ingredientFilter: Record<number, string>;
  ownedRecipeIds: number[];
  ownedBeverageIds: number[];
  ownedIngredientIds: number[];
  ownedIngredientQty: Record<number, number>;
  popularFoodTag: string | null;
  popularHateFoodTag: string | null;
  rareHideBelowScore: number;
  rareMaxExtraIngredients: number;
  rareRecipePriceSort: 'asc' | 'desc';
  rareBeveragePriceSort: 'asc' | 'desc';
  rareHiddenCustomerIds: number[];
  rareCustomerTags: Record<number, { food: string | null; bev: string | null }>;
  rareDisabledIngredientIds: number[];
  rareFavoriteRecipesByCustomer: Record<string, number[]>;
  rareFavoriteBeverages: Record<string, number[]>;
  showRecipeProfit: boolean;
} {
  const trimmed = str.trim();
  if (!trimmed.startsWith(MAGIC_PREFIX)) {
    throw new Error('无效的配置字符串：缺少标识头');
  }

  const compressed = trimmed.slice(MAGIC_PREFIX.length);
  const json = decompressFromEncodedURIComponent(compressed);
  if (!json) {
    throw new Error('无效的配置字符串：解压失败');
  }

  let config: ExportableConfig;
  try {
    config = JSON.parse(json);
  } catch {
    throw new Error('无效的配置字符串：JSON解析失败');
  }

  if (!config.v || config.v > CONFIG_VERSION) {
    throw new Error(`不支持的配置版本：${config.v}`);
  }

  const rareCustomerTags: Record<number, { food: string | null; bev: string | null }> = {};
  if (config.ct) {
    for (const [k, v] of Object.entries(config.ct)) {
      rareCustomerTags[Number(k)] = { food: v.f, bev: v.b };
    }
  }

  const rareFavoriteRecipesByCustomer: Record<string, number[]> = {};
  if (Array.isArray(config.fr)) {
    // 兼容 v3：全局收藏数组。迁移为一个独立桶，避免再被默认共享。
    const globalBucket: number[] = [];
    for (const id of config.fr) {
      if (typeof id !== 'number' || !Number.isFinite(id)) continue;
      if (!globalBucket.includes(id)) globalBucket.push(id);
    }
    rareFavoriteRecipesByCustomer._legacy_global = globalBucket;
  } else if (config.fr && typeof config.fr === 'object') {
    for (const [k, values] of Object.entries(config.fr)) {
      const normalized: number[] = [];
      for (const value of values as Array<number | string>) {
        const recipeId = typeof value === 'number'
          ? value
          : Number(String(value).split(':')[0]);
        if (!Number.isFinite(recipeId)) continue;
        if (!normalized.includes(recipeId)) normalized.push(recipeId);
      }
      rareFavoriteRecipesByCustomer[k] = normalized;
    }
  }

  const importedHideScore = typeof config.hs === 'number'
    ? config.hs
    : (config.hn === false ? 0 : 3);

  return {
    recipeFilter: expandFilter(config.rf ?? {}),
    beverageFilter: expandFilter(config.bf ?? {}),
    ingredientFilter: expandFilter(config.if ?? {}),
    ownedRecipeIds: config.or ?? [],
    ownedBeverageIds: config.ob ?? [],
    ownedIngredientIds: config.oi ?? [],
    ownedIngredientQty: config.oq ?? {},
    popularFoodTag: config.pf ?? null,
    popularHateFoodTag: config.ph ?? null,
    rareHideBelowScore: Math.max(0, Math.min(3, importedHideScore)),
    rareMaxExtraIngredients: Math.max(0, Math.min(4, config.mx ?? 4)),
    rareRecipePriceSort: config.rs === 'asc' ? 'asc' : 'desc',
    rareBeveragePriceSort: config.bs === 'asc' ? 'asc' : 'desc',
    rareHiddenCustomerIds: config.hc ?? [],
    rareCustomerTags,
    rareDisabledIngredientIds: config.di ?? [],
    rareFavoriteRecipesByCustomer,
    rareFavoriteBeverages: config.fb ?? {},
    showRecipeProfit: config.sp ?? false,
  };
}

/** Export config as a downloadable JSON file */
export function downloadConfigFile(configStr: string, filename = 'mystia-steward-config.txt') {
  const blob = new Blob([configStr], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read a config file and return its text content */
export function readConfigFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('未选择文件')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    };
    input.click();
  });
}
