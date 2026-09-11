import type {
  Ingredient,
  RecipeStep,
} from "../domain/Recipe";

import type {
  RecipeImportDraft,
} from "../domain/RecipeImport";

export type RecipeImportFormValues = {
  title: string;
  notes: string;

  servings: string;
  yieldQuantity: string;
  yieldUnit: string;

  prepMinutes: string;
  cookMinutes: string;

  ingredients: Ingredient[];
  steps: RecipeStep[];

  sourceUrl: string;
};

function createImportFieldId(
  type: "ingredient" | "step",
  index: number,
) {
  return `import-${type}-${Date.now()}-${index}`;
}

export function recipeImportDraftToFormValues(
  draft: RecipeImportDraft,
): RecipeImportFormValues {
  return {
    title: draft.title ?? "",
    notes: "",

    servings: draft.servings ?? "",
    yieldQuantity: "",
    yieldUnit: "",

    prepMinutes: draft.prepMinutes?.toString() ?? "",
    cookMinutes: draft.cookMinutes?.toString() ?? "",

    ingredients:
      draft.ingredients.length > 0
        ? draft.ingredients.map((ingredient, index) => ({
            id: createImportFieldId("ingredient", index),
            quantity: "",
            unit: "",
            name: ingredient,
          }))
        : [
            {
              id: createImportFieldId("ingredient", 0),
              quantity: "",
              unit: "",
              name: "",
            },
          ],

    steps:
      draft.steps.length > 0
        ? draft.steps.map((step, index) => ({
            id: createImportFieldId("step", index),
            text: step,
          }))
        : [
            {
              id: createImportFieldId("step", 0),
              text: "",
            },
          ],

    sourceUrl: draft.sourceUrl,
  };
}