import type { Recipe } from "../domain/Recipe";
import {
  normalizeRecipe,
  type NormalizeRecipeIssue,
} from "../domain/normalizeRecipe";
import { supabase } from "./supabase";

export type LoadRecipeFromSupabaseResult =
  | { status: "found"; recipe: Recipe }
  | { status: "not_found" }
  | { status: "invalid"; issues: NormalizeRecipeIssue[] };

function logNormalizationIssues(
  context: { recipeId?: string; rowIndex?: number },
  issues: NormalizeRecipeIssue[],
): void {
  if (issues.length === 0) {
    return;
  }

  console.warn("Recipe JSON normalized with diagnostics.", {
    ...context,
    issues,
  });
}

export async function saveRecipeToSupabase(
  recipe: Recipe,
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("recipes")
    .upsert({
      id: recipe.id,
      user_id: user.id,
      data: recipe,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
}

export async function loadRecipesFromSupabase(): Promise<
  Recipe[]
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("id, data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((row, rowIndex) => {
    const result = normalizeRecipe(row.data);

    if (!result.ok) {
      console.error("Invalid Recipe JSON skipped during list load.", {
        recipeId: row.id,
        rowIndex,
        issues: result.issues,
      });
      return [];
    }

    logNormalizationIssues(
      { recipeId: row.id, rowIndex },
      result.issues,
    );
    return [result.recipe];
  });
}

export async function loadRecipeFromSupabase(
  recipeId: string,
): Promise<LoadRecipeFromSupabaseResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("data")
    .eq("id", recipeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { status: "not_found" };
  }

  const result = normalizeRecipe(data.data);

  if (!result.ok) {
    console.error("Invalid Recipe JSON found during single Recipe load.", {
      recipeId,
      issues: result.issues,
    });
    return { status: "invalid", issues: result.issues };
  }

  logNormalizationIssues({ recipeId }, result.issues);
  return { status: "found", recipe: result.recipe };
}

export async function deleteRecipeFromSupabase(
  recipeId: string,
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}
