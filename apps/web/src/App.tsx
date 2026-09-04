import { supabase } from "./lib/supabase";
import {
  deleteRecipeFromSupabase,
  loadRecipeFromSupabase,
  loadRecipesFromSupabase,
  saveRecipeToSupabase,
} from "./lib/recipesRepository";
import Login from "./pages/Login";
import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import NewRecipe from "./pages/NewRecipe";
import RecipeDetail from "./pages/RecipeDetail";

import type { Recipe } from "./domain/Recipe";
import {
  getRecipePhotoStoragePaths,
  removeRecipePhotos,
} from "./lib/recipePhotosRepository";

export default function App() {

  const [isAuthenticated, setIsAuthenticated] =
  useState<boolean | null>(null);

  useEffect(() => {
  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setIsAuthenticated(Boolean(session));
  }

  checkSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setIsAuthenticated(Boolean(session));
    },
  );

  return () => {
    subscription.unsubscribe();
  };
}, []);

  const [recipes, setRecipes] =
  useState<Recipe[]>([]);

  const [hasLoadedRecipes, setHasLoadedRecipes] =
  useState(false);

  useEffect(() => {
  async function loadCloudRecipes() {
    if (!isAuthenticated) {
      return;
    }

    try {
      const cloudRecipes =
        await loadRecipesFromSupabase();

      setRecipes(cloudRecipes);
    } catch (error) {
      console.error(
        "Errore nel caricamento delle ricette da Supabase:",
        error,
      );
    } finally {
      setHasLoadedRecipes(true);
    }
  }

  loadCloudRecipes();
}, [isAuthenticated]);


  async function addRecipe(recipe: Recipe) {
  await saveRecipeToSupabase(recipe);

  setRecipes((currentRecipes) => [
    recipe,
    ...currentRecipes,
  ]);
}

async function updateRecipe(updatedRecipe: Recipe) {
  try {
    await saveRecipeToSupabase(updatedRecipe);

    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === updatedRecipe.id
          ? updatedRecipe
          : recipe,
      ),
    );

    return true;
  } catch (error) {
    console.error(
      "Errore nell'aggiornamento della ricetta su Supabase:",
      error,
    );

    return false;
  }
}

async function detachRecipeVariant(variant: Recipe): Promise<boolean> {
  const detachedVariant: Recipe = {
    ...variant,
    parentRecipeId: undefined,
  };
  let confirmedVariant: Recipe = detachedVariant;

  try {
    await saveRecipeToSupabase(detachedVariant);
  } catch (error) {
    console.error(
      "Errore nello scollegamento della variante da Supabase:",
      { recipeId: variant.id, error },
    );

    try {
      const remoteResult = await loadRecipeFromSupabase(variant.id);

      if (
        remoteResult.status !== "found" ||
        remoteResult.recipe.parentRecipeId !== undefined
      ) {
        return false;
      }

      confirmedVariant = remoteResult.recipe;
    } catch (verificationError) {
      console.error(
        "Esito dello scollegamento variante incerto: verifica remota fallita.",
        { recipeId: variant.id, verificationError },
      );
      return false;
    }
  }

  setRecipes((currentRecipes) =>
    currentRecipes.map((currentRecipe) =>
      currentRecipe.id === confirmedVariant.id
        ? confirmedVariant
        : currentRecipe,
    ),
  );

  return true;
}

async function deleteRecipe(recipe: Recipe): Promise<boolean> {
  const storagePaths = getRecipePhotoStoragePaths(recipe);
  let databaseDeleteConfirmed = false;

  try {
    await deleteRecipeFromSupabase(recipe.id);
    databaseDeleteConfirmed = true;
  } catch (error) {
    console.error(
      "Errore nell'eliminazione della ricetta da Supabase:",
      { recipeId: recipe.id, error },
    );

    try {
      const remoteResult = await loadRecipeFromSupabase(recipe.id);
      databaseDeleteConfirmed = remoteResult.status === "not_found";

      if (remoteResult.status === "invalid") {
        console.error(
          "Cancellazione Recipe non confermata: la riga esiste con payload invalido.",
          { recipeId: recipe.id, issues: remoteResult.issues },
        );
      }
    } catch (verificationError) {
      console.error(
        "Esito della cancellazione Recipe incerto: verifica remota fallita; stato locale e foto conservati.",
        { recipeId: recipe.id, storagePaths, verificationError },
      );
      return false;
    }

    if (!databaseDeleteConfirmed) {
      return false;
    }
  }

  setRecipes((currentRecipes) =>
    currentRecipes.filter((currentRecipe) => currentRecipe.id !== recipe.id),
  );

  if (storagePaths.length > 0) {
    try {
      await removeRecipePhotos(storagePaths);
    } catch (cleanupError) {
      console.error(
        "Recipe eliminata, ma cleanup Storage fallito: possibili file orfani conservati.",
        { recipeId: recipe.id, storagePaths, cleanupError },
      );
    }
  }

  return true;
}

if (isAuthenticated === null) {
  return null;
}

if (!isAuthenticated) {
  return (
    <Login
      onLogin={() => setIsAuthenticated(true)}
    />
  );
}

  return (
     <Routes>
      <Route
  path="/"
  element={<Home />}
/>

      <Route
  path="/recipes"
  element={
    <Recipes
      recipes={recipes}
      onUpdate={updateRecipe}
    />
  }
/>

      <Route
  path="/recipes/new"
  element={
    <NewRecipe
      onSave={addRecipe}
      recipes={recipes}
    />
  }
/>

      <Route
  path="/recipes/:recipeId/variant"
  element={
    <NewRecipe
      onSave={addRecipe}
      recipes={recipes}
    />
  }
/>

<Route
  path="/recipes/:recipeId/edit"
  element={
    <NewRecipe
      onSave={addRecipe}
      recipes={recipes}
      onUpdate={updateRecipe}
    />
  }
/>

      <Route
  path="/recipes/:recipeId"
  element={
    <RecipeDetail
  recipes={recipes}
  isLoading={!hasLoadedRecipes}
  onUpdate={updateRecipe}
  onDetachVariant={detachRecipeVariant}
  onDelete={deleteRecipe}
/>
  }
/>
    </Routes>
    
);
  }
