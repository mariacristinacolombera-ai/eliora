import type { Recipe } from "../../../domain/Recipe";
import "./RecipeCard.css";

type RecipeCardProps = {
  recipe: Recipe;
  isNew?: boolean;
};

export default function RecipeCard({
  recipe,
  isNew = false,
}: RecipeCardProps) {
  
  return (
    <article
  className={`recipe-card ${
    isNew ? "recipe-card--new" : ""
  }`}
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

      <div className="recipe-card__tags">

        <span className="recipe-card__category">
          {recipe.category}
        </span>

        {recipe.tags.map((tag) => (
          <span
            key={tag}
            className="recipe-card__tag"
          >
            {tag}
          </span>
        ))}

      </div>
      {recipe.memory && (
        <p className="recipe-card__memory">
        {recipe.memory}
        </p>
      )}

    </article>
  );
}