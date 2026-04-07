/**
 * 配置导入/导出工具
 * 使用 lz-string 压缩 JSON，生成适合剪贴板复制的短字符串
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

const CONFIG_VERSION = 1;
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
  hn: boolean;        // rareHideNonPerfect
  hc: number[];       // rareHiddenCustomerIds
  ct: Record<string, { f: string | null; b: string | null }>; // rareCustomerTags (compressed)
  di: number[];       // rareDisabledIngredientIds
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
  rareHideNonPerfect: boolean;
  rareHiddenCustomerIds: number[];
  rareCustomerTags: Record<number, { food: string | null; bev: string | null }>;
  rareDisabledIngredientIds: number[];
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
    hn: state.rareHideNonPerfect,
    hc: state.rareHiddenCustomerIds,
    ct,
    di: state.rareDisabledIngredientIds,
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
  rareHideNonPerfect: boolean;
  rareHiddenCustomerIds: number[];
  rareCustomerTags: Record<number, { food: string | null; bev: string | null }>;
  rareDisabledIngredientIds: number[];
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
    rareHideNonPerfect: config.hn ?? true,
    rareHiddenCustomerIds: config.hc ?? [],
    rareCustomerTags,
    rareDisabledIngredientIds: config.di ?? [],
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
