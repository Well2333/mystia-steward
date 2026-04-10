import allRecipes from '../src/data/recipes.json';
import allIngredients from '../src/data/ingredients.json';
import { getAllRareCustomers, rankRecipesForRare } from '../src/lib/rare-recommend';
import { useGameStore, type FilterState } from '../src/stores/game-store';
import type { ICustomerRare, IIngredient, IRecipe } from '../src/lib/types';

interface Scenario {
  name: string;
  ownedIngredientIds: number[];
  ingredientFilter: Record<number, FilterState>;
  disabledIngredientIds: number[];
}

interface ScenarioStats {
  name: string;
  tagPairsChecked: number;
  recipesChecked: number;
  availableIngredients: number;
}

const recipes = allRecipes as IRecipe[];
const ingredients = allIngredients as IIngredient[];
const rareCustomers = getAllRareCustomers() as ICustomerRare[];

const allRecipeIds = new Set(recipes.map((r) => r.id));
const ingredientByName = new Map(ingredients.map((i) => [i.name, i]));

function buildIngredientFilter(state: FilterState): Record<number, FilterState> {
  const filter: Record<number, FilterState> = {};
  for (const ing of ingredients) {
    filter[ing.id] = state;
  }
  return filter;
}

function assertRecipeUsesAvailableIngredients(
  recipe: IRecipe,
  availableIngredientIds: Set<number>,
  disabledIngredientIds: Set<number>,
): string | null {
  for (const name of recipe.ingredients) {
    const ingredient = ingredientByName.get(name);
    if (!ingredient) {
      return `missing ingredient metadata for base ingredient: ${name}`;
    }
    if (!availableIngredientIds.has(ingredient.id)) {
      return `base ingredient not available: recipe=${recipe.name}, ingredient=${ingredient.name}`;
    }
    if (disabledIngredientIds.has(ingredient.id)) {
      return `base ingredient disabled but used: recipe=${recipe.name}, ingredient=${ingredient.name}`;
    }
  }
  return null;
}

function runScenario(scenario: Scenario): { stats: ScenarioStats; errors: string[] } {
  const errors: string[] = [];

  useGameStore.setState({
    ingredientFilter: scenario.ingredientFilter,
    ownedIngredientIds: scenario.ownedIngredientIds,
  });

  const derivedIngredientIds = useGameStore.getState().getRareIngredientIds();
  const ownedSet = new Set(scenario.ownedIngredientIds);

  for (const id of derivedIngredientIds) {
    if (!ownedSet.has(id)) {
      errors.push(`derived ingredient is not owned: ${id}`);
    }
  }

  const availableIngredientIds = new Set(derivedIngredientIds);
  const disabledIngredientIds = new Set(scenario.disabledIngredientIds);

  let tagPairsChecked = 0;
  let recipesChecked = 0;

  for (const customer of rareCustomers) {
    for (const requiredFoodTag of customer.positiveTags) {
      for (const requiredBevTag of customer.beverageTags) {
        tagPairsChecked += 1;

        const recipeResults = rankRecipesForRare(
          customer,
          requiredFoodTag,
          requiredBevTag,
          allRecipeIds,
          availableIngredientIds,
          disabledIngredientIds,
          null,
          null,
        );

        for (const result of recipeResults) {
          recipesChecked += 1;

          const baseCheckError = assertRecipeUsesAvailableIngredients(
            result.recipe,
            availableIngredientIds,
            disabledIngredientIds,
          );
          if (baseCheckError) {
            errors.push(baseCheckError);
          }

          for (const extra of result.extraIngredients) {
            if (!availableIngredientIds.has(extra.id)) {
              errors.push(`extra ingredient not available: recipe=${result.recipe.name}, ingredient=${extra.name}`);
            }
            if (disabledIngredientIds.has(extra.id)) {
              errors.push(`extra ingredient disabled but used: recipe=${result.recipe.name}, ingredient=${extra.name}`);
            }
          }
        }
      }
    }
  }

  return {
    stats: {
      name: scenario.name,
      tagPairsChecked,
      recipesChecked,
      availableIngredients: availableIngredientIds.size,
    },
    errors,
  };
}

function runTargetedScenario(): { summary: string; errors: string[] } {
  const errors: string[] = [];
  const customer = rareCustomers.find((c) => c.name === '琪露诺');
  if (!customer) {
    return {
      summary: 'targeted-cirno-check: skipped (customer not found)',
      errors,
    };
  }

  const excludedNames = new Set(['玉米', '棉花糖']);
  const availableIngredientIds = new Set(
    ingredients.filter((i) => !excludedNames.has(i.name)).map((i) => i.id),
  );

  const recipeResults = rankRecipesForRare(
    customer,
    '猎奇',
    '可加冰',
    allRecipeIds,
    availableIngredientIds,
    new Set<number>(),
    null,
    null,
  );

  const excludedHits = recipeResults.filter(
    (r) =>
      r.extraIngredients.some((i) => excludedNames.has(i.name)) ||
      r.recipe.ingredients.some((name) => excludedNames.has(name)),
  );

  if (excludedHits.length > 0) {
    for (const hit of excludedHits) {
      errors.push(`targeted check failed: recipe=${hit.recipe.name}`);
    }
  }

  return {
    summary: `targeted-cirno-check: recipes=${recipeResults.length}, excludedHits=${excludedHits.length}`,
    errors,
  };
}

function main() {
  const ownedSubsetA = ingredients.filter((i) => i.id % 3 !== 0).map((i) => i.id);
  const ownedSubsetB = ingredients.filter((i) => i.id % 4 !== 0).map((i) => i.id);

  const scenarios: Scenario[] = [
    {
      name: 'partial-owned-with-all-filter',
      ownedIngredientIds: ownedSubsetA,
      ingredientFilter: buildIngredientFilter('all'),
      disabledIngredientIds: [],
    },
    {
      name: 'all-owned-with-disabled-subset',
      ownedIngredientIds: ingredients.map((i) => i.id),
      ingredientFilter: buildIngredientFilter('all'),
      disabledIngredientIds: ingredients.filter((i) => i.id % 7 === 0).map((i) => i.id),
    },
    {
      name: 'partial-owned-with-rare-filter-and-disabled',
      ownedIngredientIds: ownedSubsetB,
      ingredientFilter: Object.fromEntries(
        ingredients.map((i) => [i.id, i.id % 2 === 0 ? 'rare' : 'all' satisfies FilterState]),
      ),
      disabledIngredientIds: ingredients.filter((i) => i.id % 9 === 0).map((i) => i.id),
    },
  ];

  const allErrors: string[] = [];
  const summaries: ScenarioStats[] = [];

  for (const scenario of scenarios) {
    const result = runScenario(scenario);
    summaries.push(result.stats);
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        allErrors.push(`[${scenario.name}] ${err}`);
      }
    }
  }

  const targeted = runTargetedScenario();
  allErrors.push(...targeted.errors);

  console.log('Rare recommendation ingredient validation summary:');
  for (const summary of summaries) {
    console.log(
      `- ${summary.name}: pairs=${summary.tagPairsChecked}, recipes=${summary.recipesChecked}, availableIngredients=${summary.availableIngredients}`,
    );
  }
  console.log(`- ${targeted.summary}`);

  if (allErrors.length > 0) {
    console.error(`Validation failed with ${allErrors.length} error(s).`);
    for (const err of allErrors.slice(0, 20)) {
      console.error(`  * ${err}`);
    }
    if (allErrors.length > 20) {
      console.error(`  ... ${allErrors.length - 20} more`);
    }
    throw new Error('Rare recommendation ingredient validation failed');
  }

  console.log('Validation passed: no unowned or disabled ingredients were used in rare recipe recommendations.');
}

main();
