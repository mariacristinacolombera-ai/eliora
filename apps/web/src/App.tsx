import { supabase } from "./lib/supabase";
import {
  deleteRecipeFromSupabase,
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
  setRecipes((currentRecipes) => [
    recipe,
    ...currentRecipes,
  ]);

  try {
    await saveRecipeToSupabase(recipe);
  } catch (error) {
    console.error(
      "Errore nel salvataggio della ricetta su Supabase:",
      error,
    );
  }
}

async function updateRecipe(updatedRecipe: Recipe) {
  setRecipes((currentRecipes) =>
    currentRecipes.map((recipe) =>
      recipe.id === updatedRecipe.id
        ? updatedRecipe
        : recipe,
    ),
  );

  try {
    await saveRecipeToSupabase(updatedRecipe);
  } catch (error) {
    console.error(
      "Errore nell'aggiornamento della ricetta su Supabase:",
      error,
    );
  }
}

async function deleteRecipe(recipeId: string) {
  setRecipes((currentRecipes) =>
    currentRecipes.filter(
      (recipe) => recipe.id !== recipeId,
    ),
  );

  try {
    await deleteRecipeFromSupabase(recipeId);
  } catch (error) {
    console.error(
      "Errore nell'eliminazione della ricetta da Supabase:",
      error,
    );
  }
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
  onDelete={deleteRecipe}
/>
  }
/>
    </Routes>
    
);
  }