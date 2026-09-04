import { useNavigate, useParams } from "react-router-dom";
import type {
  Recipe,
  RecipePreparation,
} from "../domain/Recipe";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseQuantity,
  scaleIngredients,
} from "../lib/recipeScaling";
import "./RecipeDetail.css";
import {
  ArrowLeft,
  CopyPlus,
  Pencil,
  Trash2,
  Repeat2,
  X,
} from "lucide-react";
import {
  compensateRecipePhotoAfterFailedSave,
  createRecipePhotoUploadTarget,
  createRecipePhotoSignedUrls,
  uploadRecipePhoto,
} from "../lib/recipePhotosRepository";
import { compressRecipePhoto } from "../lib/imageCompression";
import {
  getLatestPreparation,
  getPreparationsByRecency,
} from "../lib/recipePreparations";

function isSafeWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type RecipeDetailProps = {
  recipes: Recipe[];
  onUpdate: (recipe: Recipe) => Promise<boolean>;
  onDetachVariant: (recipe: Recipe) => Promise<boolean>;
  onDelete: (recipe: Recipe) => Promise<boolean>;
  isLoading: boolean;
};

export default function RecipeDetail({
  recipes,
  isLoading,
  onUpdate,
  onDetachVariant,
  onDelete,
}: RecipeDetailProps) {
  const navigate = useNavigate();
  const { recipeId } = useParams();
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false);
  const [newMemory, setNewMemory] = useState("");
  const [openMemoryMenuId, setOpenMemoryMenuId] =
  useState<string | null>(null);
  const [editingMemoryId, setEditingMemoryId] =
  useState<string | null>(null);
  const [editingMemoryText, setEditingMemoryText] =
  useState("");
  const [deletingMemoryId, setDeletingMemoryId] =
  useState<string | null>(null);
  const [newOutcome, setNewOutcome] = useState<
  "liked" | "neutral" | "disliked" | ""
  >("");
  const [newPreparationPhotoFile, setNewPreparationPhotoFile] =
    useState<File>();
  const [newPreparationPhotoInputKey, setNewPreparationPhotoInputKey] =
    useState(0);
  const [isSavingPreparation, setIsSavingPreparation] = useState(false);
  const [preparationSaveError, setPreparationSaveError] = useState<string>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [photoUrls, setPhotoUrls] = useState<{
    recipeId: string;
    byPhotoId: Record<string, string>;
  } | null>(null);
  const [enlargedPreparationPhoto, setEnlargedPreparationPhoto] = useState<{
    url: string;
    alt: string;
  } | null>(null);
  const preparationPhotoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [deleteVariantsToo, setDeleteVariantsToo] = useState(false);
  const [scaledServings, setScaledServings] =
  useState<string | null>(null);
  const [
  scalingIngredientId,
  setScalingIngredientId,
] = useState<string | null>(null);

const [
  scalingIngredientValue,
  setScalingIngredientValue,
] = useState<string>("");

  const recipe = recipes.find(
    (item) => item.id === recipeId,
  );

  const currentRecipeId = recipe?.id;
  const requestedPhotos = useMemo(() => {
    if (!recipe) {
      return [];
    }

    const requestedPhotoIds = new Set([
      recipe.coverPhotoId,
      ...(recipe.preparations ?? []).map((preparation) => preparation.photoId),
    ]);

    return (recipe.photos ?? []).filter((photo) =>
      requestedPhotoIds.has(photo.id),
    );
  }, [recipe]);

  useEffect(() => {
    let isCurrent = true;

    setPhotoUrls(null);

    if (!currentRecipeId || requestedPhotos.length === 0) {
      return () => {
        isCurrent = false;
      };
    }

    const storagePaths = requestedPhotos.map((photo) => photo.storagePath);

    createRecipePhotoSignedUrls(storagePaths)
      .then((signedUrls) => {
        const byPhotoId = Object.fromEntries(
          requestedPhotos.flatMap((photo) => {
            const url = signedUrls[photo.storagePath];
            return url ? [[photo.id, url]] : [];
          }),
        );

        if (isCurrent) {
          setPhotoUrls({ recipeId: currentRecipeId, byPhotoId });
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load recipe photos", error);
      });

    return () => {
      isCurrent = false;
    };
  }, [currentRecipeId, requestedPhotos]);

  useEffect(() => {
    if (!enlargedPreparationPhoto) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEnlargedPreparationPhoto(null);
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);

      if (preparationPhotoTriggerRef.current?.isConnected) {
        preparationPhotoTriggerRef.current.focus();
      }
    };
  }, [enlargedPreparationPhoto]);

  if (isLoading) {
  return (
    <main className="recipe-detail">
      <p>Caricamento...</p>
    </main>
  );
}

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

  const currentRecipe = recipe;

 const baseServings = Number(recipe.servings);

const scaledServingsNumber =
  scaledServings !== null
    ? Number(scaledServings)
    : baseServings;

const scalingIngredient =
  scalingIngredientId !== null
    ? recipe.ingredients.find(
        (ingredient) =>
          ingredient.id === scalingIngredientId,
      )
    : undefined;

const baseIngredientQuantity =
  scalingIngredient
    ? parseQuantity(
        scalingIngredient.quantity,
      )
    : null;

const scaledIngredientQuantity =
  parseQuantity(
    scalingIngredientValue,
  );

const scalingFactor =
  scalingIngredient &&
  baseIngredientQuantity !== null &&
  baseIngredientQuantity > 0 &&
  scaledIngredientQuantity !== null &&
  scaledIngredientQuantity > 0
    ? scaledIngredientQuantity /
      baseIngredientQuantity
    : scaledServingsNumber !== baseServings &&
        Number.isFinite(scaledServingsNumber) &&
        scaledServingsNumber > 0 &&
        Number.isFinite(baseServings) &&
        baseServings > 0
      ? scaledServingsNumber / baseServings
      : 1;

  const isScalingActive =
  scalingFactor !== 1;

const displayedIngredients = scaleIngredients(
  recipe.ingredients,
  scalingFactor,
);

  

  const preparationsByRecency = getPreparationsByRecency(recipe.preparations);
  const lastPreparation = getLatestPreparation(recipe.preparations);

    const parentRecipe = recipe.parentRecipeId
  ? recipes.find(
      (item) => item.id === recipe.parentRecipeId,
    )
  : undefined;

  const childVariants = recipes.filter(
  (item) => item.parentRecipeId === recipe.id,
  );

  function formatPreparationDate(date?: string) {
  if (!date) {
    return "Data non disponibile";
  }

  const preparationDate = new Date(date);
  const today = new Date();

  if (!Number.isFinite(preparationDate.getTime())) {
    return "Data non disponibile";
  }

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

function renderPreparationPhoto(preparation: RecipePreparation) {
  if (
    !preparation.photoId ||
    preparation.photoId === currentRecipe.coverPhotoId ||
    photoUrls?.recipeId !== currentRecipe.id
  ) {
    return null;
  }

  const url = photoUrls.byPhotoId[preparation.photoId];

  if (!url) {
    return null;
  }

  const alt = `Foto della preparazione di ${currentRecipe.title} del ${formatPreparationDate(preparation.preparedAt)}`;

  return (
    <figure className="recipe-detail__preparation-photo">
      <button
        type="button"
        className="recipe-detail__preparation-photo-button"
        aria-label={`Ingrandisci: ${alt}`}
        onClick={(event) => {
          preparationPhotoTriggerRef.current = event.currentTarget;
          setEnlargedPreparationPhoto({ url, alt });
        }}
      >
        <img
          src={url}
          alt={alt}
          onError={() => {
            setPhotoUrls((currentPhotoUrls) => {
              if (
                !currentPhotoUrls ||
                currentPhotoUrls.recipeId !== currentRecipe.id
              ) {
                return currentPhotoUrls;
              }

              const byPhotoId = { ...currentPhotoUrls.byPhotoId };
              delete byPhotoId[preparation.photoId!];

              return { ...currentPhotoUrls, byPhotoId };
            });
          }}
        />
      </button>
    </figure>
  );
}

function hasUniquePreparationId(preparationId: string) {
  return (
    Boolean(preparationId) &&
    (currentRecipe.preparations ?? []).filter(
      (preparation) => preparation.id === preparationId,
    ).length === 1
  );
}

function startEditingMemory(preparation: RecipePreparation) {
  if (!hasUniquePreparationId(preparation.id) || !preparation.memory) {
    return;
  }

  setEditingMemoryId(preparation.id);
  setEditingMemoryText(preparation.memory);
  setOpenMemoryMenuId(null);
  setDeletingMemoryId(null);
}

function cancelEditingMemory() {
  setEditingMemoryId(null);
  setEditingMemoryText("");
}

function saveEditedMemory(preparationId: string) {
  const normalizedMemory = editingMemoryText.trim();

  if (!normalizedMemory || !hasUniquePreparationId(preparationId)) {
    return;
  }

  onUpdate({
    ...currentRecipe,
    preparations: (currentRecipe.preparations ?? []).map((preparation) =>
      preparation.id === preparationId
        ? {
            ...preparation,
            memory: normalizedMemory,
          }
        : preparation,
    ),
  });

  cancelEditingMemory();
}

function requestDeleteMemory(preparationId: string) {
  if (!hasUniquePreparationId(preparationId)) {
    return;
  }

  setDeletingMemoryId(preparationId);
  setOpenMemoryMenuId(null);
  cancelEditingMemory();
}

function confirmDeleteMemory(preparationId: string) {
  if (!hasUniquePreparationId(preparationId)) {
    return;
  }

  onUpdate({
    ...currentRecipe,
    preparations: (currentRecipe.preparations ?? []).map((preparation) => {
      if (preparation.id !== preparationId) {
        return preparation;
      }

      const preparationWithoutMemory = { ...preparation };
      delete preparationWithoutMemory.memory;

      return preparationWithoutMemory;
    }),
  });

  setDeletingMemoryId(null);
}

function renderMemoryActions(preparation: RecipePreparation) {
  if (
    !preparation.memory ||
    !hasUniquePreparationId(preparation.id) ||
    editingMemoryId === preparation.id ||
    deletingMemoryId === preparation.id
  ) {
    return null;
  }

  return (
    <div className="recipe-detail__memory-actions">
      <button
        type="button"
        className="recipe-detail__memory-menu-trigger"
        aria-label="Azioni ricordo"
        aria-expanded={openMemoryMenuId === preparation.id}
        onClick={() =>
          setOpenMemoryMenuId((currentId) =>
            currentId === preparation.id
              ? null
              : preparation.id,
          )
        }
      >
        •••
      </button>

      {openMemoryMenuId === preparation.id && (
        <div className="recipe-detail__memory-menu">
          <button
            type="button"
            onClick={() => startEditingMemory(preparation)}
          >
            Modifica ricordo
          </button>

          <button
            type="button"
            className="recipe-detail__memory-menu-delete"
            onClick={() => requestDeleteMemory(preparation.id)}
          >
            Elimina ricordo
          </button>
        </div>
      )}
    </div>
  );
}

function renderEditableMemory(preparation: RecipePreparation) {
  if (editingMemoryId === preparation.id) {
    return (
      <div className="recipe-detail__memory-editor">
        <textarea
          className="recipe-detail__memory-prompt-input"
          value={editingMemoryText}
          onChange={(event) =>
            setEditingMemoryText(event.target.value)
          }
          autoFocus
        />

        <div className="recipe-detail__memory-prompt-actions">
          <button
            type="button"
            className="recipe-detail__memory-prompt-skip"
            onClick={cancelEditingMemory}
          >
            Annulla
          </button>

          <button
            type="button"
            className="recipe-detail__memory-prompt-save"
            disabled={!editingMemoryText.trim()}
            onClick={() => saveEditedMemory(preparation.id)}
          >
            Custodisci
          </button>
        </div>
      </div>
    );
  }

  if (deletingMemoryId === preparation.id) {
    return (
      <div className="recipe-detail__memory-delete-confirm">
        <p>Eliminare questo ricordo?</p>
        <p>La preparazione e la sua data resteranno nello storico.</p>

        <div className="recipe-detail__memory-prompt-actions">
          <button
            type="button"
            className="recipe-detail__memory-prompt-skip"
            onClick={() => setDeletingMemoryId(null)}
          >
            Annulla
          </button>

          <button
            type="button"
            className="recipe-detail__memory-delete-button"
            onClick={() => confirmDeleteMemory(preparation.id)}
          >
            Elimina
          </button>
        </div>
      </div>
    );
  }

  return null;
}

  function markAsTried() {
  setPreparationSaveError(undefined);
  setShowMemoryPrompt(true);
}

async function confirmDelete(recipeToDelete: Recipe) {
  if (isDeleting) {
    return;
  }

  setIsDeleting(true);
  setDeleteError(undefined);

  try {
    if (deleteVariantsToo) {
      for (const variant of childVariants) {
        const didDeleteVariant = await onDelete(variant);

        if (!didDeleteVariant) {
          setDeleteError(
            "Alcune varianti sono state eliminate, ma non è stato possibile completare la cancellazione. La ricetta principale è ancora disponibile.",
          );
          return;
        }
      }
    } else {
      for (const variant of childVariants) {
        const didDetachVariant = await onDetachVariant(variant);

        if (!didDetachVariant) {
          setDeleteError(
            "Non è stato possibile scollegare tutte le varianti. La ricetta non è stata eliminata.",
          );
          return;
        }
      }
    }

    const didDeleteRecipe = await onDelete(recipeToDelete);

    if (!didDeleteRecipe) {
      setDeleteError(
        childVariants.length === 0
          ? "Non è stato possibile eliminare la ricetta."
          : deleteVariantsToo
          ? "Le varianti elaborate sono state eliminate, ma non è stato possibile eliminare la ricetta principale."
          : "Le varianti sono state scollegate, ma non è stato possibile eliminare la ricetta principale.",
      );
      return;
    }

    navigate("/recipes");
  } finally {
    setIsDeleting(false);
  }
}

async function confirmTried(
  recipeToUpdate: Recipe,
  includeMemory: boolean,
) {
  if (isSavingPreparation) {
    return;
  }

  setIsSavingPreparation(true);
  setPreparationSaveError(undefined);

  let uploadedPhoto: Awaited<ReturnType<typeof uploadRecipePhoto>> | undefined;
  let photoUploadTarget: Awaited<
    ReturnType<typeof createRecipePhotoUploadTarget>
  > | undefined;
  let operation: "compression" | "upload" | "save" = "compression";

  try {
    if (newPreparationPhotoFile) {
      const compressedPhoto = await compressRecipePhoto(
        newPreparationPhotoFile,
      );
      photoUploadTarget = await createRecipePhotoUploadTarget(recipeToUpdate.id);
      operation = "upload";
      uploadedPhoto = await uploadRecipePhoto({
        photo: photoUploadTarget,
        file: compressedPhoto,
      });
    }

    const preparation: RecipePreparation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      preparedAt: new Date().toISOString(),
      outcome: newOutcome || undefined,
      memory: includeMemory ? newMemory.trim() || undefined : undefined,
      photoId: uploadedPhoto?.id,
    };

    operation = "save";
    const didSave = await onUpdate({
      ...recipeToUpdate,
      status: "tried",
      photos: uploadedPhoto
        ? [...(recipeToUpdate.photos ?? []), uploadedPhoto]
        : recipeToUpdate.photos,
      preparations: [
        ...(recipeToUpdate.preparations ?? []),
        preparation,
      ],
    });

    if (!didSave) {
      throw new Error("Recipe update failed");
    }

    setShowMemoryPrompt(false);
    setNewMemory("");
    setNewOutcome("");
    setNewPreparationPhotoFile(undefined);
    setNewPreparationPhotoInputKey((currentKey) => currentKey + 1);
  } catch (error) {
    if (uploadedPhoto && operation === "save") {
      await compensateRecipePhotoAfterFailedSave(
        recipeToUpdate.id,
        uploadedPhoto,
      );
    } else if (photoUploadTarget && operation === "upload") {
      console.error(
        "Recipe photo upload outcome is uncertain; preserving the known path for later cleanup rather than deleting it.",
        photoUploadTarget,
      );
    }

    console.error("Errore nel salvataggio della preparazione:", error);
    setPreparationSaveError(
      operation === "compression"
        ? "Non è stato possibile leggere o elaborare la foto. Scegli un file JPEG, PNG o WebP valido e riprova."
        : operation === "upload"
          ? "Non è stato possibile caricare la foto. Controlla la connessione e riprova."
          : "Non è stato possibile salvare la preparazione. I dati del form sono ancora qui: riprova.",
    );
  } finally {
    setIsSavingPreparation(false);
  }
}

function resetScaling() {
  setScaledServings(null);
  setScalingIngredientId(null);
  setScalingIngredientValue("");
}

  return (
    <main className="recipe-detail surface-paper">
      <header
        className={`recipe-detail__header${
          photoUrls?.recipeId === recipe.id &&
          recipe.coverPhotoId &&
          photoUrls.byPhotoId[recipe.coverPhotoId]
            ? " recipe-detail__header--with-cover"
            : ""
        }`}
      >
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

        {photoUrls?.recipeId === recipe.id &&
          recipe.coverPhotoId &&
          photoUrls.byPhotoId[recipe.coverPhotoId] && (
          <figure className="recipe-detail__cover-photo">
            <img
              src={photoUrls.byPhotoId[recipe.coverPhotoId]}
              alt={`Foto di copertina di ${recipe.title}`}
              onError={() => {
                setPhotoUrls((currentPhotoUrls) => {
                  if (
                    !currentPhotoUrls ||
                    currentPhotoUrls.recipeId !== recipe.id
                  ) {
                    return currentPhotoUrls;
                  }

                  const byPhotoId = { ...currentPhotoUrls.byPhotoId };
                  delete byPhotoId[recipe.coverPhotoId!];

                  return { ...currentPhotoUrls, byPhotoId };
                });
              }}
            />
          </figure>
        )}

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
    disabled={isDeleting}
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
          disabled={isDeleting}
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
      setDeleteError(undefined);
    }}
    disabled={isDeleting}
  >
    Annulla
  </button>

  <button
    type="button"
    className="eliora-button--destructive"
    onClick={() => confirmDelete(recipe)}
    disabled={isDeleting}
  >
    {isDeleting ? "Eliminazione..." : "Conferma eliminazione"}
  </button>
</div>
  {deleteError && (
    <p role="alert">
      {deleteError}
    </p>
  )}
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
        disabled={isSavingPreparation}
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
        disabled={isSavingPreparation}
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
        disabled={isSavingPreparation}
      >
        Non mi è piaciuta
      </button>
    </div>
  </div>

    <div className="recipe-detail__preparation-photo-field">
      <span className="recipe-detail__preparation-photo-label">
        Foto della preparazione
      </span>
      <input
        key={newPreparationPhotoInputKey}
        id="new-preparation-photo"
        className="recipe-detail__preparation-photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={isSavingPreparation}
        onChange={(event) => {
          setNewPreparationPhotoFile(event.target.files?.[0]);
          setPreparationSaveError(undefined);
        }}
      />
      <div className="recipe-detail__preparation-photo-actions">
        <label
          className="recipe-detail__preparation-photo-action"
          htmlFor="new-preparation-photo"
          aria-disabled={isSavingPreparation}
        >
          {newPreparationPhotoFile ? "Cambia foto" : "Aggiungi foto"}
        </label>
        {newPreparationPhotoFile && (
          <>
            <span
              className="recipe-detail__preparation-photo-name"
              title={newPreparationPhotoFile.name}
            >
              {newPreparationPhotoFile.name}
            </span>
            <button
              type="button"
              disabled={isSavingPreparation}
              onClick={() => {
                setNewPreparationPhotoFile(undefined);
                setNewPreparationPhotoInputKey((currentKey) => currentKey + 1);
                setPreparationSaveError(undefined);
              }}
            >
              Rimuovi
            </button>
          </>
        )}
      </div>
    </div>

    <textarea
      className="recipe-detail__memory-prompt-input"
      value={newMemory}
      onChange={(event) => setNewMemory(event.target.value)}
      placeholder="Un momento, una reazione, qualcosa che vuoi ritrovare..."
      disabled={isSavingPreparation}
    />

    {preparationSaveError && (
      <p className="recipe-detail__preparation-save-error" role="alert">
        {preparationSaveError}
      </p>
    )}

    <div className="recipe-detail__memory-prompt-actions">
      <button
        type="button"
        className="recipe-detail__memory-prompt-skip"
        disabled={isSavingPreparation}
        onClick={() => confirmTried(recipe, false)}
      >
        {isSavingPreparation ? "Salvataggio..." : "Non ora"}
      </button>

      <button
        type="button"
        className="recipe-detail__memory-prompt-save"
        disabled={isSavingPreparation}
        onClick={() => confirmTried(recipe, true)}
      >
        {isSavingPreparation ? "Salvataggio..." : "Custodisci"}
      </button>
    </div>
  </div>
)}
      </header>

     {(
  recipe.servings ||
  recipe.yield?.quantity ||
  recipe.timing?.prepMinutes ||
  recipe.timing?.cookMinutes ||
  recipe.timing?.rest
) && (
  <section className="recipe-detail__facts-section">
    <h2 className="recipe-detail__section-title">
      Dettagli
    </h2>

    <div className="recipe-detail__facts surface-paper-soft">
          {recipe.servings && (
            <div className="recipe-detail__fact">
              <span className="recipe-detail__fact-label">
                Porzioni
              </span>

              <span>{recipe.servings}</span>
            </div>
          )}

          {recipe.yield?.quantity && (
            <div className="recipe-detail__fact">
              <span className="recipe-detail__fact-label">
                Resa
              </span>

              <span>
                {[recipe.yield.quantity, recipe.yield.unit]
                  .filter(Boolean)
                  .join(" ")}
              </span>
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
        <section className="recipe-detail__notes surface-paper-note">
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
              {Number.isFinite(baseServings) && baseServings > 0 && (
  <div className="recipe-detail__scaling">
    <label
      className="recipe-detail__scaling-label"
      htmlFor="scaled-servings"
    >
      Porzioni
    </label>

    <input
      id="scaled-servings"
      className="recipe-detail__scaling-input"
      type="number"
      min="0.1"
      step="any"
     value={
  scaledServings !== null
    ? scaledServings
    : String(baseServings)
}
onFocus={(event) => {
  if (scaledServings === null) {
    setScaledServings(String(baseServings));
  }

  event.currentTarget.select();
}}
onChange={(event) => {
  setScaledServings(event.target.value);
}}
onBlur={() => {
  const value = Number(scaledServings);

  if (
    scaledServings === "" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    setScaledServings(null);
  }
}}
    />

    {isScalingActive && (
  <button
    type="button"
    className="recipe-detail__scaling-reset"
    onClick={resetScaling}
  >
    Ripristina
  </button>
)}
  </div>
)}
{isScalingActive && (
  <p className="recipe-detail__scaling-note">
    Quantità adattate temporaneamente.
  </p>
)}
          <div className="recipe-detail__ingredients">
            {displayedIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="recipe-detail__ingredient"
              >
                <div className="recipe-detail__ingredient-amount">
  {parseQuantity(ingredient.quantity) !== null ? (
    <>
      <input
        className="recipe-detail__ingredient-scale-input"
        type="text"
        inputMode="decimal"
        value={
          scalingIngredientId === ingredient.id
            ? scalingIngredientValue
            : ingredient.quantity
        }
        onFocus={(event) => {
          setScalingIngredientId(
            ingredient.id,
          );

          setScalingIngredientValue(
            ingredient.quantity,
          );

          event.currentTarget.select();
        }}
        onChange={(event) => {
          setScalingIngredientId(
            ingredient.id,
          );

          setScalingIngredientValue(
            event.target.value,
          );
        }}
      />

      {ingredient.unit && (
  <span className="recipe-detail__ingredient-unit">
    {ingredient.unit}
  </span>
)}
    </>
  ) : (
    <>
  <span className="recipe-detail__ingredient-static-quantity">
    {ingredient.quantity}
  </span>

  {ingredient.unit && (
    <span className="recipe-detail__ingredient-unit">
      {ingredient.unit}
    </span>
  )}
</>
  )}
</div>

                <span className="recipe-detail__ingredient-name">
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

      {(lastPreparation?.memory ||
        recipe.memory ||
        (lastPreparation?.photoId &&
          lastPreparation.photoId !== recipe.coverPhotoId)) && (
  <section className="recipe-detail__memory surface-paper-soft">
    <div className="recipe-detail__memory-heading">
      <p className="recipe-detail__memory-label">
        Ricordi
      </p>

      {lastPreparation?.memory && renderMemoryActions(lastPreparation)}
    </div>

    <div className="recipe-detail__preparation-content">
      <div className="recipe-detail__preparation-copy">
        {lastPreparation?.memory &&
        (editingMemoryId === lastPreparation.id ||
          deletingMemoryId === lastPreparation.id) ? (
          renderEditableMemory(lastPreparation)
        ) : (
          (lastPreparation?.memory || recipe.memory) && (
            <p className="recipe-detail__memory-text">
              {lastPreparation?.memory || recipe.memory}
            </p>
          )
        )}
      </div>

      {lastPreparation && renderPreparationPhoto(lastPreparation)}
    </div>
  </section>
)}

{(preparationsByRecency.length > 1 || recipe.memory) && (
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
      {preparationsByRecency
  .filter((preparation) => preparation !== lastPreparation)
  .map((preparation) => (
          <div
            key={preparation.id}
            className="recipe-detail__history-item"
          >
            <div className="recipe-detail__preparation-content">
              <div className="recipe-detail__preparation-copy">
                <span className="recipe-detail__history-date">
                  {formatPreparationDate(preparation.preparedAt)}
                </span>

                {preparation.outcome && (
                  <span className="recipe-detail__history-outcome">
                    {formatOutcome(preparation.outcome)}
                  </span>
                )}

                {preparation.memory && (
                  <>
                    {editingMemoryId === preparation.id ||
                    deletingMemoryId === preparation.id ? (
                      renderEditableMemory(preparation)
                    ) : (
                      <div className="recipe-detail__history-memory-row">
                        <p className="recipe-detail__history-memory">
                          {preparation.memory}
                        </p>

                        {renderMemoryActions(preparation)}
                      </div>
                    )}
                  </>
                )}
              </div>

              {renderPreparationPhoto(preparation)}
            </div>
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

          {recipe.source.url && isSafeWebUrl(recipe.source.url) && (
            <a
              className="recipe-detail__source-link"
              href={recipe.source.url}
              target="_blank"
              rel="noreferrer"
            >
              Apri la fonte originale
            </a>
          )}

          {recipe.source.url && !isSafeWebUrl(recipe.source.url) && (
            <p className="recipe-detail__source-link">
              {recipe.source.url}
            </p>
          )}
        </section>
      )}

      {enlargedPreparationPhoto && (
        <div
          className="recipe-detail__photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Foto della preparazione ingrandita"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setEnlargedPreparationPhoto(null);
            }
          }}
        >
          <button
            type="button"
            className="recipe-detail__photo-lightbox-close"
            aria-label="Chiudi foto ingrandita"
            onClick={() => setEnlargedPreparationPhoto(null)}
            autoFocus
          >
            <X aria-hidden="true" size={24} strokeWidth={1.7} />
          </button>

          <img
            className="recipe-detail__photo-lightbox-image"
            src={enlargedPreparationPhoto.url}
            alt={enlargedPreparationPhoto.alt}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
