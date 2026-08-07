import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import RecipeHeroCard from "../features/recipes/components/RecipeHeroCard";
import "./Recipes.css";
import RecipeSearch from "../features/recipes/components/RecipeSearch";
import RecipeCard from "../features/recipes/components/RecipeCard";
import type { Recipe } from "../domain/Recipe";

type RecipesProps = {
  recipes: Recipe[];
};

export default function Recipes({
  recipes,
}: RecipesProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const createdRecipeId =
  location.state?.createdRecipeId ?? null;

const [recentlyCreatedId, setRecentlyCreatedId] =
  useState<string | null>(null);

const [showFeedbackLayer, setShowFeedbackLayer] =
  useState(Boolean(createdRecipeId));

const [showAddedMessage, setShowAddedMessage] =
  useState(false);

  useEffect(() => {
  if (!createdRecipeId) {
    return;
  }

  const messageInTimer = setTimeout(() => {
  setShowAddedMessage(true);
}, 180);

const messageOutTimer = setTimeout(() => {
  setShowAddedMessage(false);
}, 1750);

const layerOutTimer = setTimeout(() => {
  setShowFeedbackLayer(false);
}, 2300);

const highlightStartTimer = setTimeout(() => {
  setRecentlyCreatedId(createdRecipeId);
}, 2100);

const highlightEndTimer = setTimeout(() => {
  setRecentlyCreatedId(null);
}, 3900);

const highlightTimer = setTimeout(() => {
  setRecentlyCreatedId(null);
}, 4200);

const cleanNavigationTimer = setTimeout(() => {
  navigate(location.pathname, {
    replace: true,
    state: null,
  });
}, 3100);

  return () => {
    clearTimeout(messageInTimer);
    clearTimeout(messageOutTimer);
    clearTimeout(layerOutTimer);
    clearTimeout(highlightTimer);
    clearTimeout(cleanNavigationTimer);
    clearTimeout(highlightStartTimer);
    clearTimeout(highlightEndTimer);
  };
}, []);
  

  return (
  <>
    <div
      className={`recipes-page__feedback-layer ${
        showFeedbackLayer
          ? "recipes-page__feedback-layer--visible"
          : ""
      }`}
    >
      <div
        className={`recipes-page__toast ${
          showAddedMessage
            ? "recipes-page__toast--visible"
            : ""
        }`}
        role="status"
        aria-live="polite"
      >
        Ricetta aggiunta alle tue ricette
      </div>
    </div>

    <main className="recipes-page">
      <header className="recipes-page__header">
         
        <button
          type="button"
          className="recipes-page__back"
          onClick={() => navigate("/")}
          >
          ← Eliora
        </button>

        <h1 className="recipes-page__title">Ricette</h1>

        <p className="recipes-page__intro">
          Sapori, prove e ricordi da ritrovare.
        </p>
      </header>

      <RecipeHeroCard
       title="Pizza in teglia"
       preparedAt={new Date("2026-08-01T19:30:00+02:00")}
       memory="Molto leggera, spazzolata dagli ospiti."
      />

      <h2 className="recipes-page__section-title">
        Le tue ricette
      </h2>

      <RecipeSearch />

      <button
        type="button"
        className="recipes-page__new-button"
        onClick={() => navigate("/recipes/new")}
       >
       + Nuova ricetta
      </button>

      <section className="recipes-page__list">
        {recipes.map((recipe) => (
  <RecipeCard
    key={recipe.id}
    recipe={recipe}
    isNew={recipe.id === recentlyCreatedId}
  />
))}
      </section>
    </main>
    </>
  );
}