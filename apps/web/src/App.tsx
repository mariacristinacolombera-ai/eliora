import { useState } from "react";
import { Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import NewRecipe from "./pages/NewRecipe";

import { currentJourney } from "./data/currentJourney";
import { recipes as initialRecipes } from "./features/recipes/data/recipes";

import type { Recipe } from "./domain/Recipe";

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);

  function addRecipe(recipe: Recipe) {
    setRecipes((currentRecipes) => [
      recipe,
      ...currentRecipes,
    ]);
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Home currentJourney={currentJourney} />}
      />

      <Route
        path="/recipes"
        element={<Recipes recipes={recipes} />}
      />

      <Route
        path="/recipes/new"
        element={<NewRecipe onSave={addRecipe} />}
      />
    </Routes>
  );
}