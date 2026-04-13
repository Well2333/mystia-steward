/**
 * 存档解析器：解析 Mystia#x.memory 文件
 */

export interface ParsedSaveData {
  recipeGameIds: number[]; // recipeId values from save (game-internal IDs)
  ingredients: Map<number, number>; // id → quantity
  beverages: Map<number, number>;
  playerLevel: number;
  activatedDLC: string[];
}

interface SaveFile {
  storagePartial: {
    recipes: number[];
    ingredients: Record<string, number>;
    beverages: Record<string, number>;
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
  };
  allActivatedDLC: string[];
}

export function parseSaveFile(jsonText: string): ParsedSaveData {
  const save = JSON.parse(jsonText) as SaveFile;

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
  };
}
