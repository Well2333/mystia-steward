/**
 * 存档解析器：解析 Mystia#x.memory 文件
 */

import { ALL_FOOD_TAG_SET } from '@/lib/food-tags';

type SaveTagValue = string | number;

export interface ParsedSaveData {
  recipeGameIds: number[]; // recipeId values from save (game-internal IDs)
  ingredients: Map<number, number>; // id → quantity
  beverages: Map<number, number>;
  playerLevel: number;
  activatedDLC: string[];
  popularFoodTag: string | null;
  popularHateFoodTag: string | null;
  popularBeverageTags: SaveTagValue[];
  popularHateBeverageTags: SaveTagValue[];
  collabStatus: Record<string, boolean>;
}

interface SaveFile {
  storagePartial: {
    recipes: number[];
    ingredients: Record<string, number>;
    beverages: Record<string, number>;
    popLikeFoodTags?: unknown;
    popHateFoodTags?: unknown;
    popLikeBevTags?: unknown;
    popHateBevTags?: unknown;
    collabStatus?: unknown;
  };
  storagePartialDLC?: Record<
    string,
    {
      recipes: number[];
      ingredients: Record<string, number>;
      beverages: Record<string, number>;
    }
  >;
  playerPartial: {
    level: number;
    popLikeFoodTags?: unknown;
    popHateFoodTags?: unknown;
    popLikeBevTags?: unknown;
    popHateBevTags?: unknown;
    collabStatus?: unknown;
  };
  allActivatedDLC: string[];
}

function normalizeTagValueArray(value: unknown): SaveTagValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is SaveTagValue => typeof entry === 'string' || typeof entry === 'number',
  );
}

function resolveFoodTagValue(value: SaveTagValue): string | null {
  if (typeof value === 'string') {
    return ALL_FOOD_TAG_SET.has(value) ? value : null;
  }

  // 数字枚举顺序暂不信任，先禁用以避免把错误编号映射成错误标签。
  return null;
}

function getFirstValidFoodTag(value: unknown): string | null {
  for (const entry of normalizeTagValueArray(value)) {
    const tag = resolveFoodTagValue(entry);
    if (tag) return tag;
  }
  return null;
}

function normalizeCollabStatus(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const status: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(value)) {
    if (typeof enabled !== 'boolean') continue;
    status[key] = enabled;
  }
  return status;
}

export function parseSaveFile(jsonText: string): ParsedSaveData {
  const save = JSON.parse(jsonText) as SaveFile;
  const popLikeFoodTags = save.playerPartial.popLikeFoodTags ?? save.storagePartial.popLikeFoodTags;
  const popHateFoodTags = save.playerPartial.popHateFoodTags ?? save.storagePartial.popHateFoodTags;
  const popLikeBevTags = save.playerPartial.popLikeBevTags ?? save.storagePartial.popLikeBevTags;
  const popHateBevTags = save.playerPartial.popHateBevTags ?? save.storagePartial.popHateBevTags;
  const collabStatus = save.playerPartial.collabStatus ?? save.storagePartial.collabStatus;

  // 合并基础版料理 (save stores recipeId, not id)
  const recipeGameIds = [...save.storagePartial.recipes];

  // 合并食材
  const ingredients = new Map<number, number>();
  for (const [id, qty] of Object.entries(save.storagePartial.ingredients)) {
    ingredients.set(Number(id), qty);
  }

  // 合并酒水
  const beverages = new Map<number, number>();
  for (const [id, qty] of Object.entries(save.storagePartial.beverages)) {
    beverages.set(Number(id), qty);
  }

  // 合并 DLC 数据
  if (save.storagePartialDLC) {
    for (const dlcData of Object.values(save.storagePartialDLC)) {
      if (dlcData.recipes) {
        recipeGameIds.push(...dlcData.recipes);
      }
      if (dlcData.ingredients) {
        for (const [id, qty] of Object.entries(dlcData.ingredients)) {
          const numId = Number(id);
          ingredients.set(numId, (ingredients.get(numId) ?? 0) + qty);
        }
      }
      if (dlcData.beverages) {
        for (const [id, qty] of Object.entries(dlcData.beverages)) {
          const numId = Number(id);
          beverages.set(numId, (beverages.get(numId) ?? 0) + qty);
        }
      }
    }
  }

  return {
    recipeGameIds,
    ingredients,
    beverages,
    playerLevel: save.playerPartial.level,
    activatedDLC: save.allActivatedDLC,
    popularFoodTag: getFirstValidFoodTag(popLikeFoodTags),
    popularHateFoodTag: getFirstValidFoodTag(popHateFoodTags),
    popularBeverageTags: normalizeTagValueArray(popLikeBevTags),
    popularHateBeverageTags: normalizeTagValueArray(popHateBevTags),
    collabStatus: normalizeCollabStatus(collabStatus),
  };
}
