import {
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import RecipeHeroCard from "../features/recipes/components/RecipeHeroCard";
import "./Recipes.css";
import RecipeSearch from "../features/recipes/components/RecipeSearch";
import RecipeCard from "../features/recipes/components/RecipeCard";
import type { Recipe } from "../domain/Recipe";
import { getLatestPreparation } from "../lib/recipePreparations";
import { createRecipePhotoSignedUrls } from "../lib/recipePhotosRepository";

type RecipesProps = {
  recipes: Recipe[];
  onUpdate: (recipe: Recipe) => void;
};

export default function Recipes({
  recipes,
  onUpdate,
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

const [searchQuery, setSearchQuery] = useState("");
const [coverUrlsByRecipeId, setCoverUrlsByRecipeId] = useState<
  Record<string, string>
>({});
const [heroPreparationImageUrl, setHeroPreparationImageUrl] = useState<
  string
>();

const normalizedSearch = searchQuery
  .trim()
  .toLowerCase();

const filteredRecipes = useMemo(() => recipes.filter((recipe) => {
  const matchesTitle = recipe.title
    .toLowerCase()
    .includes(normalizedSearch);

  const matchesCategory = recipe.category
    .toLowerCase()
    .includes(normalizedSearch);

  const matchesTags = recipe.tags.some((tag) =>
    tag.toLowerCase().includes(normalizedSearch),
  );

  return (
    matchesTitle ||
    matchesCategory ||
    matchesTags
  );
}), [normalizedSearch, recipes]);

const latestPreparation = getLatestPreparation(
  recipes.flatMap((recipe) => recipe.preparations ?? []),
);
const latestPreparedRecipe = latestPreparation
  ? recipes.find((recipe) =>
      (recipe.preparations ?? []).includes(latestPreparation),
    )
  : undefined;
const latestPreparationPhoto =
  latestPreparedRecipe && latestPreparation?.photoId
    ? (latestPreparedRecipe.photos ?? []).find(
        (photo) => photo.id === latestPreparation.photoId,
      )
    : undefined;

const visibleCoverPhotos = useMemo(
  () =>
    filteredRecipes.flatMap((recipe) => {
      if (!recipe.coverPhotoId) {
        return [];
      }

      const coverPhoto = (recipe.photos ?? []).find(
        (photo) => photo.id === recipe.coverPhotoId,
      );

      return coverPhoto ? [{ recipeId: recipe.id, photo: coverPhoto }] : [];
    }),
  [filteredRecipes],
);

useEffect(() => {
  let isCurrent = true;

  setCoverUrlsByRecipeId({});
  setHeroPreparationImageUrl(undefined);

  if (visibleCoverPhotos.length === 0 && !latestPreparationPhoto) {
    return () => {
      isCurrent = false;
    };
  }

  createRecipePhotoSignedUrls(
    [
      ...new Set([
        ...visibleCoverPhotos.map(({ photo }) => photo.storagePath),
        ...(latestPreparationPhoto
          ? [latestPreparationPhoto.storagePath]
          : []),
      ]),
    ],
  )
    .then((signedUrls) => {
      if (!isCurrent) {
        return;
      }

      setCoverUrlsByRecipeId(
        Object.fromEntries(
          visibleCoverPhotos.flatMap(({ recipeId, photo }) => {
            const url = signedUrls[photo.storagePath];
            return url ? [[recipeId, url]] : [];
          }),
        ),
      );
      setHeroPreparationImageUrl(
        latestPreparationPhoto
          ? signedUrls[latestPreparationPhoto.storagePath]
          : undefined,
      );
    })
    .catch((error: unknown) => {
      console.error("Failed to load recipe card cover photos", error);
    });

  return () => {
    isCurrent = false;
  };
}, [latestPreparationPhoto, visibleCoverPhotos]);

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

    <main className="recipes-page surface-paper">
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

     {latestPreparedRecipe && latestPreparation && (
  <RecipeHeroCard
    id={latestPreparedRecipe.id}
    title={latestPreparedRecipe.title}
    preparedAt={
      new Date(
        latestPreparation.preparedAt,
      )
    }
    memory={
      latestPreparation.memory
    }
    preparationImageUrl={heroPreparationImageUrl}
    onRemember={(memory) => {
      const updatedRecipe = {
        ...latestPreparedRecipe,
        preparations:
          latestPreparedRecipe.preparations.map(
            (preparation) =>
              preparation.id ===
              latestPreparation.id
                ? {
                    ...preparation,
                    memory,
                  }
                : preparation,
          ),
      };

      onUpdate(updatedRecipe);
    }}
  />
)}

      <h2 className="recipes-page__section-title">
        Le tue ricette
      </h2>

      <RecipeSearch
  value={searchQuery}
  onChange={setSearchQuery}
/>


      <button
        type="button"
        className="recipes-page__new-button eliora-button--primary"
        onClick={() => navigate("/recipes/new")}
       >
       + Nuova ricetta
      </button>


        {recipes.length === 0 ? (
  <div className="recipes-page__empty-state">
    <p className="recipes-page__empty-title">
      Il tuo ricettario è ancora vuoto.
    </p>

    <p className="recipes-page__empty-text">
      Comincia dalla prima ricetta che vuoi ritrovare.
    </p>
  </div>
) : filteredRecipes.length === 0 ? (
  <p className="recipes-page__empty-search">
    Nessuna ricetta trovata.
  </p>
) : null}

      <section className="recipes-page__list">
        {filteredRecipes.map((recipe) => (
  <RecipeCard
  key={recipe.id}
  recipe={recipe}
  recipes={recipes}
  isNew={recipe.id === recentlyCreatedId}
  coverImageUrl={coverUrlsByRecipeId[recipe.id]}
/>
))}
      </section>
    </main>
    </>
  );
}
