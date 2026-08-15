import { useNavigate, useParams } from "react-router-dom";
import type { Recipe } from "../domain/Recipe";
import { useState } from "react";
import "./RecipeDetail.css";
import {
  ArrowLeft,
  CopyPlus,
  Pencil,
  Trash2,
  Repeat2,
} from "lucide-react";

type RecipeDetailProps = {
  recipes: Recipe[];
  onUpdate: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => void;
};

export default function RecipeDetail({
  recipes,
  onUpdate,
  onDelete,
}: RecipeDetailProps) {
  const navigate = useNavigate();
  const { recipeId } = useParams();
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false);
  const [newMemory, setNewMemory] = useState("");
  const [newOutcome, setNewOutcome] = useState<
  "liked" | "neutral" | "disliked" | ""
  >("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteVariantsToo, setDeleteVariantsToo] = useState(false);

  const recipe = recipes.find(
    (item) => item.id === recipeId,
  );

  if (!recipe) {
    return (
      <main className="recipe-detail">
        <button
          type="button"
          className="recipe-detail__back"
          onClick={() => navigate("/recipes")}
        >
          <ArrowLeft size={17} strokeWidth={1.2} /> Ricette
        </button>

        <p>Ricetta non trovata.</p>
      </main>
    );
  }

  const lastPreparation =
  recipe.preparations.length > 0
    ? recipe.preparations[recipe.preparations.length - 1]
    : undefined;

    const parentRecipe = recipe.parentRecipeId
  ? recipes.find(
      (item) => item.id === recipe.parentRecipeId,
    )
  : undefined;

  const childVariants = recipes.filter(
  (item) => item.parentRecipeId === recipe.id,
  );

  function formatPreparationDate(date: string) {
  const preparationDate = new Date(date);
  const today = new Date();

  const isToday =
    preparationDate.getDate() === today.getDate() &&
    preparationDate.getMonth() === today.getMonth() &&
    preparationDate.getFullYear() === today.getFullYear();

  if (isToday) {
    return "Oggi";
  }

  return preparationDate.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatOutcome(
  outcome: "liked" | "neutral" | "disliked",
) {
  switch (outcome) {
    case "liked":
      return "Mi è piaciuta";

    case "neutral":
      return "Così così";

    case "disliked":
      return "Non mi è piaciuta";
  }
}

  function markAsTried() {
  setShowMemoryPrompt(true);
}

function confirmDelete(recipeToDelete: Recipe) {
  if (childVariants.length > 0) {
    if (deleteVariantsToo) {
      childVariants.forEach((variant) => {
        onDelete(variant.id);
      });
    } else {
      childVariants.forEach((variant) => {
        onUpdate({
          ...variant,
          parentRecipeId: undefined,
        });
      });
    }
  }

  onDelete(recipeToDelete.id);
  navigate("/recipes");
}

function confirmTriedWithoutMemory(recipeToUpdate: Recipe) {
  const preparation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    preparedAt: new Date().toISOString(),
    outcome: newOutcome || undefined,
  };

  onUpdate({
    ...recipeToUpdate,
    status: "tried",
    preparations: [
      ...recipeToUpdate.preparations,
      preparation,
    ],
  });

  setShowMemoryPrompt(false);
}

function confirmTriedWithMemory(recipeToUpdate: Recipe) {
  const preparation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    preparedAt: new Date().toISOString(),
    outcome: newOutcome || undefined,
    memory: newMemory.trim() || undefined,
  };

  onUpdate({
    ...recipeToUpdate,
    status: "tried",
    preparations: [
      ...recipeToUpdate.preparations,
      preparation,
    ],
  });

  setShowMemoryPrompt(false);
  setNewMemory("");
  setNewOutcome("");
}

  return (
    <main className="recipe-detail">
      <header className="recipe-detail__header">
        <button
          type="button"
          className="recipe-detail__back"
          onClick={() => navigate("/recipes")}
        >
          ← Ricette
        </button>

        <h1 className="recipe-detail__title">
          {recipe.title}
        </h1>

        <div className="recipe-detail__meta">
  <div className="recipe-detail__recipe-tags">
    <button
      type="button"
      className="recipe-detail__category eliora-tag eliora-tag--category"
      onClick={() => {
        // Il filtro per categoria lo collegheremo dopo.
      }}
    >
      {recipe.category}
    </button>

    {recipe.tags.map((tag) => (
      <span
        key={tag}
        className="eliora-tag eliora-tag--meta"
      >
        {tag}
      </span>
    ))}
  </div>

  <p
    className={`recipe-detail__status eliora-tag eliora-tag--status recipe-detail__status--${recipe.status}`}
  >
    {recipe.status === "saved"
      ? "Da provare"
      : "Già preparata"}
  </p>
</div>

        {parentRecipe && (
  <p className="recipe-detail__variant-of">
    Variante di{" "}
    <button
      type="button"
      className="recipe-detail__variant-parent"
      onClick={() =>
        navigate(`/recipes/${parentRecipe.id}`)
      }
    >
      {parentRecipe.title}
    </button>
  </p>
)}

       {lastPreparation && (
  <div className="recipe-detail__last-preparation">
    <span className="recipe-detail__last-preparation-label">
      Ultima preparazione
    </span>

    <span className="recipe-detail__last-preparation-date">
      {formatPreparationDate(lastPreparation.preparedAt)}
    </span>

    {lastPreparation.outcome && (
      <span className="recipe-detail__last-preparation-outcome">
        {formatOutcome(lastPreparation.outcome)}
      </span>
    )}
  </div>
)}

        <button
  type="button"
  className="recipe-detail__mark-tried eliora-button--secondary"
  onClick={markAsTried}
>
  <Repeat2 size={16} strokeWidth={1.2} />

<span>
  {recipe.status === "saved"
    ? "L'ho preparata"
    : "L'ho preparata di nuovo"}
</span>
</button>

<div className="recipe-detail__actions">
  <button
    type="button"
    className="recipe-detail__edit eliora-button--ghost"
    onClick={() =>
      navigate(`/recipes/${recipe.id}/edit`)
    }
  >
    <Pencil size={17} strokeWidth={1.2} />
<span>Modifica</span>
  </button>

  <button
    type="button"
    className="recipe-detail__create-variant eliora-button--ghost"
    onClick={() =>
      navigate(`/recipes/${recipe.id}/variant`)
    }
  >
    <CopyPlus size={17} strokeWidth={1.2} />
<span>Crea variante</span>
  </button>

  <button
    type="button"
    className="recipe-detail__delete eliora-button--icon"
    onClick={() => setShowDeleteConfirm(true)}
    aria-label="Elimina ricetta"
    title="Elimina ricetta"
  >
    <Trash2 size={17} strokeWidth={1.2} />
  </button>
</div>

{showDeleteConfirm && (
  <div className="recipe-detail__delete-confirm">
    <p>
      Vuoi davvero eliminare questa ricetta?
    </p>

    {childVariants.length > 0 && (
      <label>
        <input
          type="checkbox"
          checked={deleteVariantsToo}
          onChange={(event) =>
            setDeleteVariantsToo(event.target.checked)
          }
        />

        Elimina anche le varianti
      </label>
    )}

    <div className="recipe-detail__delete-confirm-actions">
  <button
    type="button"
    className="eliora-button--secondary"
    onClick={() => {
      setShowDeleteConfirm(false);
      setDeleteVariantsToo(false);
    }}
  >
    Annulla
  </button>

  <button
    type="button"
    className="eliora-button--destructive"
    onClick={() => confirmDelete(recipe)}
  >
    Conferma eliminazione
  </button>
</div>
  </div>
)}

        {showMemoryPrompt && (
  <div className="recipe-detail__memory-prompt">
    <p className="recipe-detail__memory-prompt-title">
      L'hai preparata
    </p>

      <p className="recipe-detail__memory-prompt-text">
        C'è qualcosa che vuoi ricordare?
      </p>
    <div className="recipe-detail__outcome">
    <p className="recipe-detail__outcome-label">
      Come è andata?
    </p>

    <div className="recipe-detail__outcome-options">
      <button
        type="button"
        className={`recipe-detail__outcome-option ${
          newOutcome === "liked"
            ? "recipe-detail__outcome-option--selected"
            : ""
        }`}
        onClick={() => setNewOutcome("liked")}
      >
        Mi è piaciuta
      </button>

      <button
        type="button"
        className={`recipe-detail__outcome-option ${
          newOutcome === "neutral"
            ? "recipe-detail__outcome-option--selected"
            : ""
        }`}
        onClick={() => setNewOutcome("neutral")}
      >
        Così così
      </button>

      <button
        type="button"
        className={`recipe-detail__outcome-option ${
          newOutcome === "disliked"
            ? "recipe-detail__outcome-option--selected"
            : ""
        }`}
        onClick={() => setNewOutcome("disliked")}
      >
        Non mi è piaciuta
      </button>
    </div>
  </div>

    <textarea
      className="recipe-detail__memory-prompt-input"
      value={newMemory}
      onChange={(event) => setNewMemory(event.target.value)}
      placeholder="Un momento, una reazione, qualcosa che vuoi ritrovare..."
    />

    <div className="recipe-detail__memory-prompt-actions">
      <button
        type="button"
        className="recipe-detail__memory-prompt-skip"
        onClick={() => confirmTriedWithoutMemory(recipe)}
      >
        Non ora
      </button>

      <button
        type="button"
        className="recipe-detail__memory-prompt-save"
        onClick={() => confirmTriedWithMemory(recipe)}
      >
        Custodisci
      </button>
    </div>
  </div>
)}
      </header>

     {(recipe.servings || recipe.timing) && (
  <section className="recipe-detail__facts-section">
    <h2 className="recipe-detail__section-title">
      Dettagli
    </h2>

    <div className="recipe-detail__facts">
          {recipe.servings && (
            <div className="recipe-detail__fact">
              <span className="recipe-detail__fact-label">
                Porzioni
              </span>

              <span>{recipe.servings}</span>
            </div>
          )}

          {recipe.timing?.prepMinutes && (
            <div className="recipe-detail__fact">
              <span className="recipe-detail__fact-label">
                Preparazione
              </span>

              <span>
                {recipe.timing.prepMinutes} min
              </span>
            </div>
          )}

          {recipe.timing?.cookMinutes && (
            <div className="recipe-detail__fact">
              <span className="recipe-detail__fact-label">
                Cottura
              </span>

              <span>
                {recipe.timing.cookMinutes} min
              </span>
            </div>
          )}

          {recipe.timing?.rest && (
            <div className="recipe-detail__fact">
              <span className="recipe-detail__fact-label">
                Riposo
              </span>

              <span>
                {recipe.timing.rest.overnight
                  ? "Tutta la notte"
                  : `${recipe.timing.rest.value} ${
                      recipe.timing.rest.unit === "hours"
                        ? "ore"
                        : "min"
                    }`}
              </span>
            </div>
          )}
        </div>
        </section>
      )}

      {recipe.notes && (
        <section className="recipe-detail__notes">
          <p className="recipe-detail__notes-label">
            Note e consigli
          </p>

          <p className="recipe-detail__notes-text">
            {recipe.notes}
          </p>
        </section>
      )}

      {recipe.ingredients.length > 0 && (
        <section className="recipe-detail__section">
          <h2 className="recipe-detail__section-title">
            Ingredienti
          </h2>

          <div className="recipe-detail__ingredients">
            {recipe.ingredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="recipe-detail__ingredient"
              >
                <span className="recipe-detail__ingredient-amount">
                  {ingredient.quantity} {ingredient.unit}
                </span>

                <span>
                  {ingredient.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section className="recipe-detail__section">
          <h2 className="recipe-detail__section-title">
            Procedimento
          </h2>

          <div className="recipe-detail__steps">
            {recipe.steps.map((step, index) => (
              <div
                key={step.id}
                className="recipe-detail__step"
              >
                <span className="recipe-detail__step-number">
                  {index + 1}
                </span>

                <p className="recipe-detail__step-text">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(lastPreparation?.memory || recipe.memory) && (
  <section className="recipe-detail__memory">
    <p className="recipe-detail__memory-label">
      Ricordi
    </p>

    <p className="recipe-detail__memory-text">
      {lastPreparation?.memory || recipe.memory}
    </p>
  </section>
)}

{(recipe.preparations.length > 1 || recipe.memory) && (
  <section className="recipe-detail__history">
    <h2 className="recipe-detail__history-title">
      Preparazioni precedenti
    </h2>

    <div className="recipe-detail__history-list">

    {recipe.memory && (
  <div className="recipe-detail__history-item">
    <span className="recipe-detail__history-date">
      Primo ricordo
    </span>

    <p className="recipe-detail__history-memory">
      {recipe.memory}
    </p>
  </div>
)}
      {[...recipe.preparations]
  .slice(0, -1)
  .reverse()
  .map((preparation) => (
          <div
            key={preparation.id}
            className="recipe-detail__history-item"
          >
            <span className="recipe-detail__history-date">
              {formatPreparationDate(preparation.preparedAt)}
            </span>

            {preparation.outcome && (
  <span className="recipe-detail__history-outcome">
    {formatOutcome(preparation.outcome)}
  </span>
)}

            {preparation.memory && (
              <p className="recipe-detail__history-memory">
                {preparation.memory}
              </p>
            )}
          </div>
        ))}
    </div>
  </section>
)}
{childVariants.length > 0 && (
  <section className="recipe-detail__variants">
    <h2 className="recipe-detail__variants-title">
      Varianti
    </h2>

    <div className="recipe-detail__variants-list">
      {childVariants.map((variant) => (
        <button
          key={variant.id}
          type="button"
          className="recipe-detail__variant-item"
          onClick={() =>
            navigate(`/recipes/${variant.id}`)
          }
        >
          <span className="recipe-detail__variant-title">
            {variant.title}
          </span>

          <span className="recipe-detail__variant-arrow">
            →
          </span>
        </button>
      ))}
    </div>
  </section>
)}

      {recipe.source && (
        <section className="recipe-detail__source">
          <p className="recipe-detail__source-label">
            Fonte
          </p>

          {recipe.source.name && (
            <p className="recipe-detail__source-name">
              {recipe.source.name}
            </p>
          )}

          {recipe.source.url && (
            <a
              className="recipe-detail__source-link"
              href={recipe.source.url}
              target="_blank"
              rel="noreferrer"
            >
              Apri la fonte originale
            </a>
          )}
        </section>
      )}
    </main>
  );
}