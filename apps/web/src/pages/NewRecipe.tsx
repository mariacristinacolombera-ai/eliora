import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  Plus,
  X,
} from "lucide-react";

import { useState } from "react";
import "./NewRecipe.css";
import type {
  Ingredient,
  Recipe,
  RecipePreparation,
  RecipeStatus,
  RecipeStep,
} from "../domain/Recipe";
import { compressRecipePhoto } from "../lib/imageCompression";
import {
  removeRecipePhotos,
  uploadRecipePhoto,
} from "../lib/recipePhotosRepository";

const recipeCategories = [
  { id: "primo", label: "Primo", icon: "🍝" },
  { id: "secondo", label: "Secondo", icon: "🍽️" },
  { id: "contorno", label: "Contorno", icon: "🥕" },
  { id: "dolce", label: "Dolce", icon: "🍰" },
  { id: "colazione", label: "Colazione", icon: "☕" },
  { id: "merenda", label: "Merenda", icon: "🍪" },
  { id: "pane", label: "Pane", icon: "🍞" },
];

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateInputToPreparedAt(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day, 12).toISOString();
}

type NewRecipeProps = {
  onSave: (recipe: Recipe) => Promise<void>;
  recipes?: Recipe[];
  onUpdate?: (recipe: Recipe) => Promise<boolean>;
};

export default function NewRecipe({
  onSave,
  recipes = [],
  onUpdate,
}: NewRecipeProps) {

const navigate = useNavigate();
const { recipeId } = useParams();

const baseRecipe = recipeId
  ? recipes.find((recipe) => recipe.id === recipeId)
  : undefined;

const isEditing = Boolean(
  recipeId && window.location.pathname.endsWith("/edit"),
);

const isCreatingVariant = Boolean(
  baseRecipe && !isEditing,
);

  const [title, setTitle] = useState(
  isEditing && baseRecipe
    ? baseRecipe.title
    : isCreatingVariant && baseRecipe
      ? `${baseRecipe.title} - variante`
      : "",
);

  const [category, setCategory] = useState(
    baseRecipe?.category ?? "",
  );

  const [tags, setTags] = useState<string[]>(
  baseRecipe?.tags ?? [],
);

const [newTag, setNewTag] = useState("");
const existingTags = Array.from(
  new Set(
    recipes.flatMap((recipe) => recipe.tags),
  ),
).sort((a, b) => a.localeCompare(b));

const suggestedTags = existingTags
  .filter(
    (tag) =>
      !tags.some(
        (selectedTag) =>
          selectedTag.toLowerCase() === tag.toLowerCase(),
      ),
  )
  .filter((tag) =>
    tag
      .toLowerCase()
      .includes(newTag.trim().toLowerCase()),
  )
  .slice(0, 6);

  const [notes, setNotes] = useState(
    baseRecipe?.notes ?? "",
  );
  const [memory, setMemory] = useState("");
 const [ingredients, setIngredients] = useState<Ingredient[]>(
  baseRecipe && baseRecipe.ingredients.length > 0
    ? baseRecipe.ingredients.map((ingredient) => ({
        ...ingredient,
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
      }))
    : [
        {
          id: `${Date.now()}-ingredient`,
          quantity: "",
          unit: "",
          name: "",
        },
      ],
);

const [steps, setSteps] = useState<RecipeStep[]>(
  baseRecipe && baseRecipe.steps.length > 0
    ? baseRecipe.steps.map((step) => ({
        ...step,
        id: `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
      }))
    : [
        {
          id: `${Date.now()}-step`,
          text: "",
        },
      ],
);

const [servings, setServings] = useState(
  baseRecipe?.servings ?? "",
);
const [yieldQuantity, setYieldQuantity] = useState(
  baseRecipe?.yield?.quantity ?? "",
);
const [yieldUnit, setYieldUnit] = useState(
  baseRecipe?.yield?.unit ?? "",
);
const [prepMinutes, setPrepMinutes] = useState(
  baseRecipe?.timing?.prepMinutes?.toString() ?? "",
);

const [cookMinutes, setCookMinutes] = useState(
  baseRecipe?.timing?.cookMinutes?.toString() ?? "",
);

const [restValue, setRestValue] = useState(
  baseRecipe?.timing?.rest?.value?.toString() ?? "",
);
const [restUnit, setRestUnit] =
  useState<"minutes" | "hours">(
    baseRecipe?.timing?.rest?.unit ?? "minutes",
  );
const [restOvernight, setRestOvernight] = useState(
  baseRecipe?.timing?.rest?.overnight ?? false,
);

const [status, setStatus] = useState<RecipeStatus>(
  baseRecipe?.status ?? "saved",
);
const [firstPreparationDate, setFirstPreparationDate] = useState("");
const [firstPreparationOutcome, setFirstPreparationOutcome] = useState<
  RecipePreparation["outcome"] | ""
>("");
const [photoFile, setPhotoFile] = useState<File>();
const [photoInputKey, setPhotoInputKey] = useState(0);
const [removeExistingCover, setRemoveExistingCover] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [saveError, setSaveError] = useState<string>();

const [sourceName, setSourceName] = useState(
  baseRecipe?.source?.name ?? "",
);
const [sourceUrl, setSourceUrl] = useState(
  baseRecipe?.source?.url ?? "",
);

  const [isLeaving, setIsLeaving] = useState(false);

   function addIngredient() {
  const newIngredient: Ingredient = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    quantity: "",
    unit: "",
    name: "",
  };

  setIngredients((currentIngredients) => [
    ...currentIngredients,
    newIngredient,
  ]);
}

function updateIngredient(
  id: string,
  field: "quantity" | "unit" | "name",
  value: string,
) {
  setIngredients((currentIngredients) =>
    currentIngredients.map((ingredient) =>
      ingredient.id === id
        ? {
            ...ingredient,
            [field]: value,
          }
        : ingredient,
    ),
  );
}

function removeIngredient(id: string) {
  setIngredients((currentIngredients) =>
    currentIngredients.filter(
      (ingredient) => ingredient.id !== id,
    ),
  );
}

 function addStep() {
  const newStep: RecipeStep = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: "",
  };

  setSteps((currentSteps) => [
    ...currentSteps,
    newStep,
  ]);
  }

  function updateStep(
  id: string,
  value: string,
) {
  setSteps((currentSteps) =>
    currentSteps.map((step) =>
      step.id === id
        ? {
            ...step,
            text: value,
          }
        : step,
    ),
  );
 }

 function removeStep(id: string) {
  setSteps((currentSteps) =>
    currentSteps.filter(
      (step) => step.id !== id,
    ),
  );
 }

 function addTag() {
  const normalizedTag = newTag.trim();

  if (!normalizedTag) {
    return;
  }

  const alreadyExists = tags.some(
    (tag) =>
      tag.toLowerCase() === normalizedTag.toLowerCase(),
  );

  if (alreadyExists) {
    setNewTag("");
    return;
  }

  setTags((currentTags) => [
    ...currentTags,
    normalizedTag,
  ]);

  setNewTag("");
}

function removeTag(tagToRemove: string) {
  setTags((currentTags) =>
    currentTags.filter(
      (tag) => tag !== tagToRemove,
    ),
  );
}

  async function handleSave() {
  if (
    !title.trim() ||
    !category ||
    (!isEditing && status === "tried" && !firstPreparationDate) ||
    isLeaving ||
    isSubmitting
  ) {
    return;
  }

  setSaveError(undefined);

  const normalizedYieldQuantity = yieldQuantity.trim();
  const normalizedYieldUnit = yieldUnit.trim();
  const recipeId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (isEditing && baseRecipe && onUpdate) {
    setIsSubmitting(true);
    let uploadedPhoto: Awaited<ReturnType<typeof uploadRecipePhoto>> | undefined;
    let operation: "compression" | "upload" | "save" = "compression";
    const oldCoverPhoto = baseRecipe.photos?.find(
      (photo) => photo.id === baseRecipe.coverPhotoId,
    );
    const oldCoverIsPreparationPhoto = (baseRecipe.preparations ?? []).some(
      (preparation) => preparation.photoId === baseRecipe.coverPhotoId,
    );

    try {
      if (photoFile) {
        const compressedPhoto = await compressRecipePhoto(photoFile);
        operation = "upload";
        uploadedPhoto = await uploadRecipePhoto({
          recipeId: baseRecipe.id,
          file: compressedPhoto,
        });
      }

      const shouldRemoveOldCover = Boolean(
        oldCoverPhoto && (uploadedPhoto || removeExistingCover),
      );
      const retainedPhotos = (baseRecipe.photos ?? []).filter(
        (photo) =>
          !shouldRemoveOldCover ||
          oldCoverIsPreparationPhoto ||
          photo.id !== oldCoverPhoto?.id,
      );
      const updatedPhotos = uploadedPhoto
        ? [...retainedPhotos, uploadedPhoto]
        : retainedPhotos;

    const updatedRecipe: Recipe = {
      id: baseRecipe.id,
      title: title.trim(),
      parentRecipeId: baseRecipe.parentRecipeId,
      category,
      tags,
      notes: notes.trim() || undefined,
      memory: baseRecipe.memory,
      servings: servings.trim() || undefined,
      yield: normalizedYieldQuantity
        ? {
            quantity: normalizedYieldQuantity,
            unit: normalizedYieldUnit || undefined,
          }
        : undefined,
      timing: {
        prepMinutes: prepMinutes ? Number(prepMinutes) : undefined,
        cookMinutes: cookMinutes ? Number(cookMinutes) : undefined,
        rest:
          restOvernight || restValue
            ? {
                value: restOvernight ? undefined : Number(restValue),
                unit: restOvernight ? undefined : restUnit,
                overnight: restOvernight || undefined,
              }
            : undefined,
      },
      ingredients: ingredients.filter((ingredient) => ingredient.name.trim()),
      steps: steps.filter((step) => step.text.trim()),
      status,
      source:
        sourceName.trim() || sourceUrl.trim()
          ? {
              name: sourceName.trim() || undefined,
              url: sourceUrl.trim() || undefined,
            }
          : undefined,
      photos: updatedPhotos.length > 0 ? updatedPhotos : undefined,
      coverPhotoId: uploadedPhoto
        ? uploadedPhoto.id
        : removeExistingCover
          ? undefined
          : baseRecipe.coverPhotoId,
      preparations: baseRecipe.preparations ?? [],
    };

      operation = "save";
      const didSave = await onUpdate(updatedRecipe);

      if (!didSave) {
        throw new Error("Recipe update failed");
      }

      if (shouldRemoveOldCover && !oldCoverIsPreparationPhoto && oldCoverPhoto) {
        try {
          await removeRecipePhotos([oldCoverPhoto.storagePath]);
        } catch (cleanupError) {
          console.error(
            "Errore nella rimozione della precedente foto di copertina:",
            cleanupError,
          );
        }
      }

    setIsLeaving(true);

    setTimeout(() => {
      navigate(`/recipes/${baseRecipe.id}`);
    }, 550);

    } catch (error) {
      if (uploadedPhoto) {
        try {
          await removeRecipePhotos([uploadedPhoto.storagePath]);
        } catch (cleanupError) {
          console.error(
            "Errore nella rimozione della nuova foto dopo il salvataggio fallito:",
            cleanupError,
          );
        }
      }

      console.error("Errore nella modifica della ricetta:", error);
      setSaveError(
        operation === "compression"
          ? "Non è stato possibile leggere o elaborare la foto. Scegli un file JPEG, PNG o WebP valido e riprova."
          : operation === "upload"
            ? "Non è stato possibile caricare la foto. Controlla la connessione e riprova."
            : "Non è stato possibile salvare la ricetta. I dati del form sono ancora qui: riprova.",
      );
    } finally {
      setIsSubmitting(false);
    }

    return;
  }

  setIsSubmitting(true);
  let uploadedPhoto: Awaited<ReturnType<typeof uploadRecipePhoto>> | undefined;
  let operation: "compression" | "upload" | "save" = "compression";

  try {
    if (photoFile) {
      const compressedPhoto = await compressRecipePhoto(photoFile);
      operation = "upload";
      uploadedPhoto = await uploadRecipePhoto({
        recipeId,
        file: compressedPhoto,
      });
    }

 const newRecipe: Recipe = {
  id: recipeId,
  title: title.trim(),
  parentRecipeId: baseRecipe?.id,
  category,
  tags ,
  notes: notes.trim() || undefined,

  memory: undefined,

  servings: servings.trim() || undefined,
  yield: normalizedYieldQuantity
    ? {
        quantity: normalizedYieldQuantity,
        unit: normalizedYieldUnit || undefined,
      }
    : undefined,

  timing: {
    prepMinutes: prepMinutes
      ? Number(prepMinutes)
      : undefined,

    cookMinutes: cookMinutes
      ? Number(cookMinutes)
      : undefined,

    rest:
      restOvernight || restValue
        ? {
            value: restOvernight
              ? undefined
              : Number(restValue),

            unit: restOvernight
              ? undefined
              : restUnit,

            overnight: restOvernight || undefined,
          }
        : undefined,
  },

  ingredients: ingredients.filter(
    (ingredient) => ingredient.name.trim(),
  ),

  steps: steps.filter(
    (step) => step.text.trim(),
  ),

  status,
  photos: uploadedPhoto ? [uploadedPhoto] : undefined,
  coverPhotoId: uploadedPhoto?.id,

  preparations:
  status === "tried"
    ? [
        {
          id: `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
          preparedAt: dateInputToPreparedAt(firstPreparationDate),
          outcome: firstPreparationOutcome || undefined,
          memory: memory.trim() || undefined,
          photoId: uploadedPhoto?.id,
        },
      ]
    : [],

  source:
  sourceName.trim() || sourceUrl.trim()
    ? {
        name: sourceName.trim() || undefined,
        url: sourceUrl.trim() || undefined,
      }
    : undefined,
 };

operation = "save";
await onSave(newRecipe);

setIsLeaving(true);

setTimeout(() => {
  navigate("/recipes", {
    state: {
      createdRecipeId: newRecipe.id,
    },
  });
}, 550);

  } catch (error) {
    if (uploadedPhoto) {
      try {
        await removeRecipePhotos([uploadedPhoto.storagePath]);
      } catch (cleanupError) {
        console.error(
          "Errore nella rimozione della foto dopo il salvataggio fallito:",
          cleanupError,
        );
      }
    }

    console.error("Errore nella creazione della ricetta:", error);
    setSaveError(
      operation === "compression"
        ? "Non è stato possibile leggere o elaborare la foto. Scegli un file JPEG, PNG o WebP valido e riprova."
        : operation === "upload"
          ? "Non è stato possibile caricare la foto. Controlla la connessione e riprova."
          : "Non è stato possibile salvare la ricetta. I dati del form sono ancora qui: riprova.",
    );
  } finally {
    setIsSubmitting(false);
  }

  }

  return (
    <main
  className={`new-recipe-page surface-paper ${
    isLeaving ? "new-recipe-page--leaving" : ""
  }`}
>
      <header className="new-recipe-page__header">
        <button
          type="button"
          className="new-recipe-page__back"
          onClick={() => navigate("/recipes")}
        >
         <ArrowLeft size={17} strokeWidth={1.2} />
<span>Ricette</span>
        </button>

       <h1 className="new-recipe-page__title">
  {isEditing
    ? "Modifica ricetta"
    : isCreatingVariant
      ? "Nuova variante"
      : "Nuova ricetta"}
</h1>

       <p className="new-recipe-page__intro">
  {isEditing
    ? "Aggiorna solo ciò che vuoi cambiare."
    : isCreatingVariant && baseRecipe
      ? `Partiamo da ${baseRecipe.title}`
      : "Come si chiama?"}
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

      <section className="new-recipe-page__tags">
  <h2 className="new-recipe-page__section-title">
    Tag
  </h2>

  <p className="new-recipe-page__section-intro">
    Aggiungi caratteristiche utili per ritrovarla.
  </p>

  {tags.length > 0 && (
    <div className="new-recipe-page__tags-list">
      {tags.map((tag) => (
        <span
          key={tag}
          className="new-recipe-page__tag eliora-tag eliora-tag--meta"
        >
          {tag}

          <button
            type="button"
            className="new-recipe-page__tag-remove"
            onClick={() => removeTag(tag)}
            aria-label={`Rimuovi ${tag}`}
          >
            <X size={14} strokeWidth={1.2} />
          </button>
        </span>
      ))}
    </div>
  )}

  <div className="new-recipe-page__tag-input-row">
    <input
      className="new-recipe-page__input"
      type="text"
      value={newTag}
      onChange={(event) =>
        setNewTag(event.target.value)
      }
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addTag();
        }
      }}
      placeholder="Es. vegetariana"
    />

    <button
      type="button"
      className="new-recipe-page__tag-add eliora-button--ghost"
      onClick={addTag}
    >
      <Plus size={15} strokeWidth={1.2} />
<span>Aggiungi</span>
    </button>
  </div>
  {suggestedTags.length > 0 && (
  <div className="new-recipe-page__tag-suggestions">
    <span className="new-recipe-page__tag-suggestions-label">
      {newTag.trim() ? "Suggerimenti" : "Già usati"}
    </span>

    <div className="new-recipe-page__tag-suggestions-list">
      {suggestedTags.map((tag) => (
        <button
          key={tag}
          type="button"
          className="new-recipe-page__tag-suggestion eliora-tag eliora-tag--meta"
          onClick={() => {
            setTags((currentTags) => [
              ...currentTags,
              tag,
            ]);
            setNewTag("");
          }}
        >
          {tag}
        </button>
      ))}
    </div>
  </div>
)}
</section>

        <section className="new-recipe-page__status">
  <h2 className="new-recipe-page__section-title">
    Questa ricetta...
  </h2>

  <div className="new-recipe-page__status-options">
    <button
      type="button"
      className={`new-recipe-page__status-option ${
        status === "saved"
          ? "new-recipe-page__status-option--selected"
          : ""
      }`}
      onClick={() => setStatus("saved")}
    >
      La voglio provare
    </button>

    <button
      type="button"
      className={`new-recipe-page__status-option ${
        status === "tried"
          ? "new-recipe-page__status-option--selected"
          : ""
      }`}
      onClick={() => setStatus("tried")}
    >
      L'ho già preparata
    </button>
  </div>
</section>  

{!isEditing && status === "tried" && (
  <section className="new-recipe-page__first-preparation">
    <div className="new-recipe-page__first-preparation-date">
      <label
        className="new-recipe-page__label"
        htmlFor="first-preparation-date"
      >
        Data della preparazione
      </label>

      <div className="new-recipe-page__date-row">
        <input
          id="first-preparation-date"
          className="new-recipe-page__input"
          type="date"
          required
          value={firstPreparationDate}
          onChange={(event) => setFirstPreparationDate(event.target.value)}
        />
        <button
          type="button"
          className="new-recipe-page__today-button eliora-button--secondary"
          onClick={() => setFirstPreparationDate(formatDateInputValue(new Date()))}
        >
          Oggi
        </button>
      </div>
    </div>

    <div className="new-recipe-page__outcome">
      <p className="new-recipe-page__outcome-label">
        Esito della preparazione
      </p>
      <div className="new-recipe-page__outcome-options">
        {([
          ["liked", "Mi è piaciuta"],
          ["neutral", "Così così"],
          ["disliked", "Non mi è piaciuta"],
        ] as const).map(([outcome, label]) => (
          <button
            key={outcome}
            type="button"
            className={`new-recipe-page__outcome-option ${
              firstPreparationOutcome === outcome
                ? "new-recipe-page__outcome-option--selected"
                : ""
            }`}
            onClick={() => setFirstPreparationOutcome(outcome)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  </section>
)}

{isEditing && baseRecipe && (
  <section className="new-recipe-page__photo new-recipe-page__photo--edit">
    <p className="new-recipe-page__label">Foto di copertina</p>

    <p className="new-recipe-page__photo-note">
      {photoFile
        ? `Nuova foto selezionata: ${photoFile.name}`
        : baseRecipe.coverPhotoId && !removeExistingCover
          ? "Una foto di copertina è presente."
          : removeExistingCover
            ? "La foto di copertina verrà rimossa al salvataggio."
            : "Nessuna foto di copertina."}
    </p>

    <input
      key={photoInputKey}
      id="recipe-cover-photo-edit"
      className="new-recipe-page__photo-input new-recipe-page__photo-input--hidden"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      disabled={isSubmitting || isLeaving}
      onChange={(event) => {
        setPhotoFile(event.target.files?.[0]);
        setRemoveExistingCover(false);
        setSaveError(undefined);
      }}
    />

    <div className="new-recipe-page__photo-actions">
      <label
        className="new-recipe-page__photo-action"
        htmlFor="recipe-cover-photo-edit"
        aria-disabled={isSubmitting || isLeaving}
      >
        {baseRecipe.coverPhotoId && !removeExistingCover
          ? "Sostituisci foto"
          : "Aggiungi foto"}
      </label>

      {photoFile && (
        <button
          type="button"
          disabled={isSubmitting || isLeaving}
          onClick={() => {
            setPhotoFile(undefined);
            setPhotoInputKey((currentKey) => currentKey + 1);
          }}
        >
          Annulla selezione
        </button>
      )}

      {baseRecipe.coverPhotoId && !removeExistingCover && (
        <button
          type="button"
          className="new-recipe-page__photo-remove-action"
          disabled={isSubmitting || isLeaving}
          onClick={() => {
            setPhotoFile(undefined);
            setPhotoInputKey((currentKey) => currentKey + 1);
            setRemoveExistingCover(true);
            setSaveError(undefined);
          }}
        >
          Rimuovi foto
        </button>
      )}
    </div>
  </section>
)}

{!isEditing && (
  <section className="new-recipe-page__photo">
    <label
      className="new-recipe-page__label"
      htmlFor="recipe-photo"
    >
      {status === "saved"
        ? "Foto di copertina"
        : "Foto della prima preparazione"}
    </label>

    {status === "tried" && (
      <p className="new-recipe-page__photo-note">
        Diventerà anche la foto della ricetta.
      </p>
    )}

    <input
      key={photoInputKey}
      id="recipe-photo"
      className="new-recipe-page__photo-input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      disabled={isSubmitting || isLeaving}
      onChange={(event) => {
        setPhotoFile(event.target.files?.[0]);
        setSaveError(undefined);
      }}
    />

    {photoFile && (
      <div className="new-recipe-page__photo-selection">
        <span title={photoFile.name}>{photoFile.name}</span>
        <button
          type="button"
          disabled={isSubmitting || isLeaving}
          onClick={() => {
            setPhotoFile(undefined);
            setPhotoInputKey((currentKey) => currentKey + 1);
          }}
        >
          Rimuovi
        </button>
      </div>
    )}
  </section>
)}

 <div className="new-recipe-page__context-field">
  <div className="new-recipe-page__context-content">
    <label
      className="new-recipe-page__label"
      htmlFor="recipe-notes"
    >
      Note e consigli
    </label>

    <textarea
      id="recipe-notes"
      className="new-recipe-page__input new-recipe-page__textarea"
      value={notes}
      onChange={(event) => setNotes(event.target.value)}
      placeholder="Consigli, modifiche da provare, promemoria..."
    />

    {!isEditing && status === "tried" && (
      <div className="new-recipe-page__memory-field">
        <label
          className="new-recipe-page__label"
          htmlFor="recipe-memory"
        >
          Cosa vuoi ricordare di questa ricetta?
        </label>

        <textarea
          id="recipe-memory"
          className="new-recipe-page__input new-recipe-page__textarea"
          value={memory}
          onChange={(event) => setMemory(event.target.value)}
          placeholder="Un momento, una reazione, qualcosa che vuoi ritrovare..."
        />
      </div>
    )}
  </div>
</div>

<section className="new-recipe-page__source">
  <div className="new-recipe-page__section-header">
    <div>
      <h2 className="new-recipe-page__section-title">
        Fonte
      </h2>

      <p className="new-recipe-page__section-intro">
        Da dove arriva questa ricetta?
      </p>
    </div>
  </div>

  <div className="new-recipe-page__source-grid">
    <div className="new-recipe-page__detail-field">
      <label
        className="new-recipe-page__label"
        htmlFor="recipe-source-name"
      >
        Origine
      </label>

      <input
        id="recipe-source-name"
        className="new-recipe-page__input"
        type="text"
        value={sourceName}
        onChange={(event) => setSourceName(event.target.value)}
        placeholder="Es. Instagram, libro, mamma..."
      />
    </div>

    <div className="new-recipe-page__detail-field">
      <label
        className="new-recipe-page__label"
        htmlFor="recipe-source-url"
      >
        Link
      </label>

      <input
        id="recipe-source-url"
        className="new-recipe-page__input"
        type="url"
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
        placeholder="https://..."
      />
    </div>
  </div>
</section>

      <section className="new-recipe-page__details">
  <div className="new-recipe-page__section-header">
    <div>
      <h2 className="new-recipe-page__section-title">
        Dettagli
      </h2>

      <p className="new-recipe-page__section-intro">
        Le informazioni utili quando vorrai prepararla.
      </p>
    </div>
  </div>

  <div className="new-recipe-page__details-grid">
    <div className="new-recipe-page__detail-field new-recipe-page__detail-field--servings">
      <label
        className="new-recipe-page__label"
        htmlFor="recipe-servings"
      >
        Porzioni
      </label>

      <input
        id="recipe-servings"
        className="new-recipe-page__input"
        type="text"
        value={servings}
        onChange={(event) => setServings(event.target.value)}
        placeholder="Es. 4"
      />
    </div>

    <div className="new-recipe-page__detail-field">
      <label
        className="new-recipe-page__label"
        htmlFor="recipe-yield-quantity"
      >
        Resa
      </label>

      <input
        id="recipe-yield-quantity"
        className="new-recipe-page__input"
        type="text"
        inputMode="decimal"
        value={yieldQuantity}
        onChange={(event) => setYieldQuantity(event.target.value)}
        placeholder="Es. 17"
      />
    </div>

    <div className="new-recipe-page__detail-field">
      <label
        className="new-recipe-page__label"
        htmlFor="recipe-yield-unit"
      >
        Unità resa
      </label>

      <input
        id="recipe-yield-unit"
        className="new-recipe-page__input"
        type="text"
        value={yieldUnit}
        onChange={(event) => setYieldUnit(event.target.value)}
        placeholder="Es. würstel"
      />
    </div>

    <div className="new-recipe-page__detail-field">
      <label
        className="new-recipe-page__label"
        htmlFor="recipe-prep"
      >
        Preparazione
      </label>

      <input
        id="recipe-prep"
        className="new-recipe-page__input"
        type="number"
        inputMode="numeric"
        min="0"
        value={prepMinutes}
        onChange={(event) => setPrepMinutes(event.target.value)}
        placeholder="min"
      />
    </div>

    <div className="new-recipe-page__detail-field">
      <label
        className="new-recipe-page__label"
        htmlFor="recipe-cook"
      >
        Cottura
      </label>

      <input
        id="recipe-cook"
        className="new-recipe-page__input"
        type="number"
        inputMode="numeric"
        min="0"
        value={cookMinutes}
        onChange={(event) => setCookMinutes(event.target.value)}
        placeholder="min"
      />
    </div>

    <div className="new-recipe-page__detail-field">
      <label className="new-recipe-page__label">
        Riposo
      </label>

      <div className="new-recipe-page__rest">
        <input
          className="new-recipe-page__input"
          type="number"
          inputMode="numeric"
          min="0"
          value={restValue}
          disabled={restOvernight}
          onChange={(event) => setRestValue(event.target.value)}
          placeholder="Tempo"
        />

        <select
          className="new-recipe-page__input"
          value={restUnit}
          disabled={restOvernight}
          onChange={(event) =>
            setRestUnit(
              event.target.value as "minutes" | "hours",
            )
          }
        >
          <option value="minutes">min</option>
          <option value="hours">ore</option>
        </select>
      </div>

      <label className="new-recipe-page__overnight">
        <input
          type="checkbox"
          checked={restOvernight}
          onChange={(event) =>
            setRestOvernight(event.target.checked)
          }
        />

        Tutta la notte
      </label>
    </div>
  </div>
</section>

      <section className="new-recipe-page__ingredients">
  <div className="new-recipe-page__section-header">
    <div>
      <h2 className="new-recipe-page__section-title">
        Ingredienti
      </h2>

      <p className="new-recipe-page__section-intro">
        Aggiungili uno alla volta.
      </p>
    </div>
  </div>

  <div className="new-recipe-page__ingredient-list">
    {ingredients.map((ingredient) => (
      <div
        key={ingredient.id}
        className="new-recipe-page__ingredient"
      >
        <input
          className="new-recipe-page__ingredient-quantity"
          type="text"
          inputMode="decimal"
          value={ingredient.quantity}
          onChange={(event) =>
            updateIngredient(
              ingredient.id,
              "quantity",
              event.target.value,
            )
          }
          placeholder="Qtà"
          aria-label="Quantità"
        />

        <input
          className="new-recipe-page__ingredient-unit"
          type="text"
          value={ingredient.unit}
          onChange={(event) =>
            updateIngredient(
              ingredient.id,
              "unit",
              event.target.value,
            )
          }
          placeholder="Unità"
          aria-label="Unità di misura"
        />

        <input
          className="new-recipe-page__ingredient-name"
          type="text"
          value={ingredient.name}
          onChange={(event) =>
            updateIngredient(
              ingredient.id,
              "name",
              event.target.value,
            )
          }
          placeholder="Ingrediente"
          aria-label="Ingrediente"
        />

        <button
          type="button"
          className="new-recipe-page__ingredient-remove"
          onClick={() => removeIngredient(ingredient.id)}
          aria-label="Rimuovi ingrediente"
        >
          <X size={15} strokeWidth={1.2} />
        </button>
      </div>
    ))}
  </div>

  <button
    type="button"
    className="new-recipe-page__ingredient-add"
    onClick={addIngredient}
  >
    <Plus size={16} strokeWidth={1.2} />
<span>Aggiungi ingrediente</span>
  </button>
</section>

<section className="new-recipe-page__steps">
  <div className="new-recipe-page__section-header">
    <div>
      <h2 className="new-recipe-page__section-title">
        Procedimento
      </h2>

      <p className="new-recipe-page__section-intro">
        Raccontalo un passaggio alla volta.
      </p>
    </div>
  </div>

  <div className="new-recipe-page__step-list">
    {steps.map((step, index) => (
      <div
        key={step.id}
        className="new-recipe-page__step"
      >
        <div className="new-recipe-page__step-number">
          {index + 1}
        </div>

        <textarea
          className="new-recipe-page__step-text"
          value={step.text}
          onChange={(event) =>
            updateStep(
              step.id,
              event.target.value,
            )
          }
          placeholder={`Passaggio ${index + 1}`}
          aria-label={`Passaggio ${index + 1}`}
        />

        <button
          type="button"
          className="new-recipe-page__step-remove"
          onClick={() => removeStep(step.id)}
          aria-label={`Rimuovi passaggio ${index + 1}`}
        >
          <X size={15} strokeWidth={1.2} />
        </button>
      </div>
    ))}
  </div>

  <button
    type="button"
    className="new-recipe-page__step-add"
    onClick={addStep}
  >
   <Plus size={16} strokeWidth={1.2} />
<span>Aggiungi passaggio</span>
  </button>
</section>

      <button
        className="new-recipe-page__continue eliora-button--primary"
        type="button"
        disabled={
          !title.trim() ||
          !category ||
          (!isEditing && status === "tried" && !firstPreparationDate) ||
          isLeaving ||
          isSubmitting
        }
        onClick={handleSave}
      >
        {isSubmitting ? "Salvataggio..." : "Salva ricetta"}
      </button>
      {saveError && (
        <p className="new-recipe-page__save-error" role="alert">
          {saveError}
        </p>
      )}
    </main>
  );
}
