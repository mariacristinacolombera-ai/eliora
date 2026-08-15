import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import NewRecipe from "./pages/NewRecipe";
import RecipeDetail from "./pages/RecipeDetail";

import type { Recipe } from "./domain/Recipe";

function getInitialRecipes(): Recipe[] {
  const savedRecipes = localStorage.getItem("eliora-recipes");

  if (!savedRecipes) {
    return [];
  }

  try {
    return JSON.parse(savedRecipes) as Recipe[];
  } catch {
    return [];
  }
}

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>(getInitialRecipes);

  useEffect(() => {
  localStorage.setItem(
    "eliora-recipes",
    JSON.stringify(recipes),
  );
}, [recipes]);

  function addRecipe(recipe: Recipe) {
  setRecipes((currentRecipes) => [
    recipe,
    ...currentRecipes,
  ]);
}

function updateRecipe(updatedRecipe: Recipe) {
  setRecipes((currentRecipes) =>
    currentRecipes.map((recipe) =>
      recipe.id === updatedRecipe.id
        ? updatedRecipe
        : recipe,
    ),
  );
}

function deleteRecipe(recipeId: string) {
  setRecipes((currentRecipes) =>
    currentRecipes.filter(
      (recipe) => recipe.id !== recipeId,
    ),
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
      onUpdate={updateRecipe}
      onDelete={deleteRecipe}
    />
  }
/>
    </Routes>
  );
}