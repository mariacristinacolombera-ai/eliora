import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./NewRecipe.css";
import type { Recipe } from "../domain/Recipe";

const recipeCategories = [
  { id: "primo", label: "Primo", icon: "🍝" },
  { id: "secondo", label: "Secondo", icon: "🍽️" },
  { id: "contorno", label: "Contorno", icon: "🥕" },
  { id: "dolce", label: "Dolce", icon: "🍰" },
  { id: "colazione", label: "Colazione", icon: "☕" },
  { id: "merenda", label: "Merenda", icon: "🍪" },
  { id: "pane", label: "Pane", icon: "🍞" },
];

type NewRecipeProps = {
  onSave: (recipe: Recipe) => void;
};

export default function NewRecipe({
  onSave,
}: NewRecipeProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [memory, setMemory] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);

  const navigate = useNavigate();

  function handleSave() {
  if (!title.trim() || !category || isLeaving) {
    return;
  }

  const newRecipe: Recipe = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: title.trim(),
    category,
    tags: [],
    memory: memory.trim() || undefined,
  };

  onSave(newRecipe);

  setIsLeaving(true);

  setTimeout(() => {
    navigate("/recipes", {
      state: {
        createdRecipeId: newRecipe.id,
      },
    });
  }, 550);
}

  return (
    <main
  className={`new-recipe-page ${
    isLeaving ? "new-recipe-page--leaving" : ""
  }`}
>
      <header className="new-recipe-page__header">
        <button
          type="button"
          className="new-recipe-page__back"
          onClick={() => navigate("/recipes")}
        >
          ← Ricette
        </button>

        <h1 className="new-recipe-page__title">
          Nuova ricetta
        </h1>

        <p className="new-recipe-page__intro">
          Ogni ricetta inizia da un nome.
        </p>
      </header>

      <div className="new-recipe-page__field">
        <label
          className="new-recipe-page__label"
          htmlFor="recipe-title"
        >
          Nome
        </label>

        <input
          id="recipe-title"
          className="new-recipe-page__input"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Es. Focaccia alle zucchine"
        />
      </div>

      <fieldset className="new-recipe-page__categories">
        <legend className="new-recipe-page__label">
          Categoria
        </legend>

        <div className="new-recipe-page__category-grid">
          {recipeCategories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`new-recipe-page__category ${
                category === item.id
                  ? "new-recipe-page__category--selected"
                  : ""
              }`}
              onClick={() => setCategory(item.id)}
            >
              <span className="new-recipe-page__category-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="new-recipe-page__field new-recipe-page__memory-field">
        <label
          className="new-recipe-page__label"
          htmlFor="recipe-memory"
        >
          C'è qualcosa che vuoi ricordare?
        </label>

        <textarea
          id="recipe-memory"
          className="new-recipe-page__input new-recipe-page__textarea"
          value={memory}
          onChange={(event) => setMemory(event.target.value)}
          placeholder="Puoi lasciarlo vuoto e aggiungerlo dopo."
        />
      </div>

      <button
        className="new-recipe-page__continue"
        type="button"
        disabled={!title.trim() || !category || isLeaving}
        onClick={handleSave}
      >
        Salva ricetta
      </button>
    </main>
  );
}