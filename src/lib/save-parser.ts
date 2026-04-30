/**
 * 存档解析器：解析 Mystia#x.memory 文件
 */

import foodTagIdMap from '@/data/food-tag-id-map.json';
import { ALL_FOOD_TAG_SET } from '@/lib/food-tags';

type SaveTagValue = string | number;

const FOOD_TAG_NAME_ALIASES: Readonly<Record<string, string>> = {
  '流行·喜爱': '流行喜爱',
  '流行·厌恶': '流行厌恶',
};

const FOOD_TAG_ID_MAP: Readonly<Record<string, string>> = foodTagIdMap;

export interface ParsedSaveData {
  recipeGameIds: number[]; // recipeId values from save (game-internal IDs)
  ingredients: Map<number, number>; // id → quantity
  beverages: Map<number, number>;
  playerLevel: number;
  activatedDLC: string[];
  popularFoodTag: string | null;
  popularHateFoodTag: string | null;
  famousShopEnabled: boolean;
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
    trackedSwitch?: unknown;
  };
  storagePartialDLC?: Record<
    string,
    {
      recipes: number[];
      ingredients: Record<string, number>;
      beverages: Record<string, number>;
    }
  >;
  dayScenePartial?: {
    trackedSwitch?: unknown;
  };
  playerPartial: {
    level: number;
    popLikeFoodTags?: unknown;
    popHateFoodTags?: unknown;
    popLikeBevTags?: unknown;
    popHateBevTags?: unknown;
    collabStatus?: unknown;
    trackedSwitch?: unknown;
  };
  allActivatedDLC: string[];
}

function normalizeTagValueArray(value: unknown): SaveTagValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is SaveTagValue => typeof entry === 'string' || typeof entry === 'number',
  );
}

function normalizeFoodTagName(value: string): string {
  return FOOD_TAG_NAME_ALIASES[value] ?? value;
}

function resolveFoodTagValue(value: SaveTagValue): string | null {
  const resolvedTag = typeof value === 'string'
    ? normalizeFoodTagName(value)
    : normalizeFoodTagName(FOOD_TAG_ID_MAP[String(value)] ?? '');

  return ALL_FOOD_TAG_SET.has(resolvedTag) ? resolvedTag : null;
}

function getFirstValidFoodTag(value: unknown): string | null {
  for (const entry of normalizeTagValueArray(value)) {
    const tag = resolveFoodTagValue(entry);
    if (tag) return tag;
  }
  return null;
}

function normalizeBooleanRecord(value: unknown): Record<string, boolean> {
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
  const trackedSwitch = save.dayScenePartial?.trackedSwitch
    ?? save.playerPartial.trackedSwitch
    ?? save.storagePartial.trackedSwitch;
  const trackedSwitchState = normalizeBooleanRecord(trackedSwitch);
  const famousShopEnabled = trackedSwitchState.Aya_FamousIzakaya === true;
  const popularFoodTag = getFirstValidFoodTag(popLikeFoodTags);

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
    popularFoodTag: famousShopEnabled && popularFoodTag === '招牌' ? null : popularFoodTag,
    popularHateFoodTag: getFirstValidFoodTag(popHateFoodTags),
    famousShopEnabled,
    popularBeverageTags: normalizeTagValueArray(popLikeBevTags),
    popularHateBeverageTags: normalizeTagValueArray(popHateBevTags),
    collabStatus: normalizeBooleanRecord(collabStatus),
  };
}
