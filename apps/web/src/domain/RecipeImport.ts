export type RecipeImportDraft = {
  title?: string;
  description?: string;

  servings?: string;
  yield?: string;

  prepMinutes?: number;
  cookMinutes?: number;

  ingredients: string[];
  steps: string[];

  sourceUrl: string;
  imageUrl?: string;
};