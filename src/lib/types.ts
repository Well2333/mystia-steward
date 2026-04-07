export type TPlace =
  | '妖怪兽道'
  | '人间之里'
  | '博丽神社'
  | '红魔馆'
  | '迷途竹林'
  | '魔法森林'
  | '妖怪之山'
  | '旧地狱'
  | '地灵殿'
  | '命莲寺'
  | '神灵庙'
  | '太阳花田'
  | '辉针城'
  | '月之都'
  | '魔界';

export const ALL_PLACES: TPlace[] = [
  '妖怪兽道', '人间之里', '博丽神社', '红魔馆', '迷途竹林',
  '魔法森林', '妖怪之山', '旧地狱', '地灵殿', '命莲寺',
  '神灵庙', '太阳花田', '辉针城', '月之都', '魔界',
];

export type TDlc = 0 | 1 | 2 | 2.5 | 3 | 4 | 5 | 9;

export interface IRecipe {
  id: number;
  recipeId: number;
  name: string;
  description: string;
  ingredients: string[];
  positiveTags: string[];
  negativeTags: string[];
  cooker: string;
  baseCookTime: number;
  dlc: TDlc;
  level: number;
  price: number;
  from: Record<string, unknown>;
}

export interface IIngredient {
  id: number;
  name: string;
  description: string;
  type: string;
  tags: string[];
  dlc: TDlc;
  level: number;
  price: number;
  from: Record<string, unknown>;
}

export interface IBeverage {
  id: number;
  name: string;
  description: string;
  tags: string[];
  dlc: TDlc;
  level: number;
  price: number;
  from: Record<string, unknown>;
}

export interface ICustomerNormal {
  id: number;
  name: string;
  description: string;
  dlc: TDlc;
  places: TPlace[];
  positiveTags: string[];
  beverageTags: string[];
}

export interface ICustomerRare {
  id: number;
  name: string;
  description: string | string[];
  dlc: TDlc;
  places: TPlace[];
  price: number[];
  enduranceLimit: number;
  positiveTags: string[];
  negativeTags: string[];
  beverageTags: string[];
  collection: boolean;
  evaluation: Record<string, string>;
  spellCards: {
    positive: Array<{ name: string; description: string }>;
    negative: Array<{ name: string; description: string }>;
  };
}

export type TRating = '极佳' | '佳' | '一般';

export interface ICustomerScore {
  name: string;
  score: number;
}

export interface INormalRecipeResult {
  recipe: IRecipe;
  customerScores: ICustomerScore[];
  totalCoverage: number;
  profit: number;
  matchedTags: string[];
  ingredientCost: number;
}

export interface INormalBeverageResult {
  beverage: IBeverage;
  customerScores: ICustomerScore[];
  totalCoverage: number;
  matchedTags: string[];
}

export interface IRareRecipeResult {
  recipe: IRecipe;
  extraIngredients: IIngredient[];
  allTags: string[];
  cancelledTags: string[];
  foodScore: number;
  meetsRequiredFood: boolean;
  rating: TRating;
  baseCost: number;
  extraCost: number;
}

export interface IRareBeverageResult {
  beverage: IBeverage;
  bevScore: number;
  meetsRequiredBev: boolean;
  matchedTags: string[];
}
