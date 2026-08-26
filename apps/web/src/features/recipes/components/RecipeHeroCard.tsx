import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecipeHeroCard.css";

type RecipeHeroCardProps = {
  id: string;
  title: string;
  preparedAt: Date;
  memory?: string;
  onRemember: (memory: string) => void;
};

export default function RecipeHeroCard({
  id,
  title,
  preparedAt,
  memory,
  onRemember,
}: RecipeHeroCardProps) {
  const [showRemember, setShowRemember] = useState(false);
const [newMemory, setNewMemory] = useState(memory ?? "");
  const formattedDate = preparedAt.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const navigate = useNavigate();

  return (
    <article className="recipe-hero surface-paper-soft">
      <p className="recipe-hero__eyebrow">L’ultima volta</p>

      <h2 className="recipe-hero__title">{title}</h2>

      <p className="recipe-hero__date">
        Preparata il {formattedDate}
      </p>

      {memory && (
  <p className="recipe-hero__memory">
    {memory}
  </p>
)}

      <div className="recipe-hero__actions">
        <button
         className="recipe-hero__button eliora-button--primary"
          type="button"
          onClick={() => navigate(`/recipes/${id}`)}
            >
           Apri
        </button>

        <button
  className="recipe-hero__button eliora-button--secondary"
  type="button"
  onClick={() => setShowRemember(true)}
>
  Ricorda
</button>
      </div>
      {showRemember && (
  <div className="recipe-hero__remember">
    <textarea
      className="recipe-hero__remember-input"
      value={newMemory}
      onChange={(event) =>
        setNewMemory(event.target.value)
      }
      placeholder="Un momento, una reazione, qualcosa che vuoi ritrovare..."
    />

    <div className="recipe-hero__remember-actions">
      <button
        type="button"
        className="eliora-button--secondary"
        onClick={() => setShowRemember(false)}
      >
        Annulla
      </button>

      <button
        type="button"
        className="eliora-button--primary"
        onClick={() => {
          const trimmedMemory = newMemory.trim();

          if (!trimmedMemory) {
            return;
          }

          onRemember(trimmedMemory);
          setShowRemember(false);
        }}
      >
        Custodisci
      </button>
    </div>
  </div>
)}
    </article>
  );
}