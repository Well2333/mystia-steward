/**
 * Maps item IDs to their sprite index (position in data array)
 * Sprites are ordered by array index, not by ID
 */
import allRecipes from '@/data/recipes.json';
import allIngredients from '@/data/ingredients.json';
import allBeverages from '@/data/beverages.json';
import allNormalCustomers from '@/data/customer_normal.json';
import allRareCustomers from '@/data/customer_rare.json';

function buildIndexMap(items: Array<{ id: number }>): Map<number, number> {
  const map = new Map<number, number>();
  items.forEach((item, index) => map.set(item.id, index));
  return map;
}

export const recipeIndexMap = buildIndexMap(allRecipes as Array<{ id: number }>);
export const ingredientIndexMap = buildIndexMap(allIngredients as Array<{ id: number }>);
export const beverageIndexMap = buildIndexMap(allBeverages as Array<{ id: number }>);
export const normalCustomerIndexMap = buildIndexMap(allNormalCustomers as Array<{ id: number }>);
export const rareCustomerIndexMap = buildIndexMap(allRareCustomers as Array<{ id: number }>);
