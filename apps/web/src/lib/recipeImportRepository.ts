import type { RecipeImportDraft } from "../domain/RecipeImport";
import { supabase } from "./supabase";

type ImportRecipeFunctionResponse = {
  draft?: RecipeImportDraft;
};

export async function importRecipeFromUrl(
  url: string,
): Promise<RecipeImportDraft> {
  const { data, error } = await supabase.functions.invoke<
    ImportRecipeFunctionResponse
  >("import-recipe", {
    body: { url },
  });

  if (error) {
    throw error;
  }

  if (!data?.draft) {
    throw new Error("Recipe data not found");
  }

  return data.draft;
}