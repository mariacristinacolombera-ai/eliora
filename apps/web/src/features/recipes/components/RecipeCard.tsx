import type { Recipe } from "../../../domain/Recipe";
import { useNavigate } from "react-router-dom";
import "./RecipeCard.css";

type RecipeCardProps = {
  recipe: Recipe;
  recipes: Recipe[];
  isNew?: boolean;
};

export default function RecipeCard({
  recipe,
  recipes,
  isNew = false,
}: RecipeCardProps)
 {
  const navigate = useNavigate();

  const lastPreparation =
  recipe.preparations.length > 0
    ? recipe.preparations[recipe.preparations.length - 1]
    : undefined;

const displayedMemory =
  lastPreparation?.memory || recipe.memory;

const parentRecipe = recipe.parentRecipeId
  ? recipes.find(
      (item) => item.id === recipe.parentRecipeId,
    )
  : undefined;
  
  return (
    <article
  className={`recipe-card surface-paper-soft ${
    isNew ? "recipe-card--new" : ""
  }`}
  onClick={() =>
    navigate(`/recipes/${recipe.id}`)
  }
>
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

    </article>
  );
}