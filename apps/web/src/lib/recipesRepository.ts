import type { Recipe } from "../domain/Recipe";
import { supabase } from "./supabase";

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
    .select("data, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.data as Recipe);
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