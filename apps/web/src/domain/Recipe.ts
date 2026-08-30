export type Ingredient = {
  id: string;
  quantity: string;
  unit: string;
  name: string;
};

export type RecipeStep = {
  id: string;
  text: string;
};

export type RecipeTiming = {
  prepMinutes?: number;
  cookMinutes?: number;
  rest?: {
    value?: number;
    unit?: "minutes" | "hours";
    overnight?: boolean;
  };
};

export type RecipeYield = {
  quantity?: string;
  unit?: string;
};

export type RecipeStatus = "saved" | "tried";

export type RecipeSource = {
  name?: string;
  url?: string;
};

export type RecipePhoto = {
  id: string;
  storagePath: string;
};

export type RecipePreparation = {
  id: string;
  preparedAt: string;
  outcome?: "liked" | "neutral" | "disliked";
  memory?: string;
  photoId?: string;
};

export type Recipe = {
  id: string;
  title: string;
  parentRecipeId?: string;
  category: string;
  tags: string[];
  isSpecial?: boolean;
  memory?: string;

  status: RecipeStatus;
  source?: RecipeSource;

  notes?: string;

  servings?: string;
  yield?: RecipeYield;
  timing?: RecipeTiming;

  ingredients: Ingredient[];
  steps: RecipeStep[];

  photos?: RecipePhoto[];
  coverPhotoId?: string;
  preparations: RecipePreparation[];
};
