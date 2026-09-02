import type { Recipe } from "../../../domain/Recipe";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecipeCard.css";
import { getLatestPreparation } from "../../../lib/recipePreparations";

type RecipeCardProps = {
  recipe: Recipe;
  recipes: Recipe[];
  isNew?: boolean;
  coverImageUrl?: string;
};

export default function RecipeCard({
  recipe,
  recipes,
  isNew = false,
  coverImageUrl,
}: RecipeCardProps)
 {
  const navigate = useNavigate();
  const [failedCoverUrl, setFailedCoverUrl] = useState<string>();

  const lastPreparation = getLatestPreparation(recipe.preparations);

const displayedMemory =
  lastPreparation?.memory || recipe.memory;

const parentRecipe = recipe.parentRecipeId
  ? recipes.find(
      (item) => item.id === recipe.parentRecipeId,
    )
  : undefined;
const displayedCoverUrl =
  coverImageUrl && coverImageUrl !== failedCoverUrl
    ? coverImageUrl
    : undefined;
  
  return (
    <article
  className={`recipe-card surface-paper-soft ${
    isNew ? "recipe-card--new" : ""
  }${displayedCoverUrl ? " recipe-card--with-cover" : ""}`}
  onClick={() =>
    navigate(`/recipes/${recipe.id}`)
  }
>
      <div className="recipe-card__content">
      <header className="recipe-card__header">
        <h3 className="recipe-card__title">
          {recipe.title}

          {recipe.isSpecial && (
            <span className="recipe-card__special">
              ○
            </span>
          )}
        </h3>
      </header>

      {parentRecipe && (
  <p className="recipe-card__variant-of">
    Variante di {parentRecipe.title}
  </p>
)}

      <div className="recipe-card__tags">

        <span className="recipe-card__category eliora-tag eliora-tag--category">
  {recipe.category}
</span>

        {recipe.tags.map((tag) => (
          <span
            key={tag}
            className="recipe-card__tag eliora-tag eliora-tag--meta"
          >
            {tag}
          </span>
        ))}

      </div>
      {displayedMemory && (
  <p className="recipe-card__memory">
    {displayedMemory}
  </p>
)}
      </div>

      {displayedCoverUrl && (
        <img
          className="recipe-card__cover"
          src={displayedCoverUrl}
          alt={`Foto di copertina di ${recipe.title}`}
          loading="lazy"
          onError={() => setFailedCoverUrl(displayedCoverUrl)}
        />
      )}

    </article>
  );
}
