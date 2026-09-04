import type {
  Ingredient,
  Recipe,
  RecipePhoto,
  RecipePreparation,
  RecipeSource,
  RecipeStep,
  RecipeTiming,
  RecipeYield,
} from "./Recipe";

export type NormalizeRecipeIssue = {
  path: string;
  code: string;
  message: string;
};

export type NormalizeRecipeResult =
  | {
      ok: true;
      recipe: Recipe;
      issues: NormalizeRecipeIssue[];
    }
  | {
      ok: false;
      recipe: null;
      issues: NormalizeRecipeIssue[];
    };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function deterministicId(
  recipeId: string,
  type: "ingredient" | "step" | "preparation",
  index: number,
): string {
  return `legacy-${type}:${recipeId}:${index}`;
}

function addIssue(
  issues: NormalizeRecipeIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

function normalizeOptionalString(
  record: UnknownRecord,
  key: string,
  issues: NormalizeRecipeIssue[],
): string | undefined {
  const value = record[key];
  const normalized = nonEmptyString(value);

  if (
    hasOwn(record, key) &&
    value !== undefined &&
    value !== null &&
    typeof value !== "string"
  ) {
    addIssue(
      issues,
      key,
      "invalid_optional_string",
      `${key} must be a string when present.`,
    );
  }

  return normalized;
}

function normalizeTags(
  value: unknown,
  issues: NormalizeRecipeIssue[],
): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    addIssue(issues, "tags", "invalid_array", "tags must be an array.");
    return [];
  }

  const tags: string[] = [];
  const seen = new Set<string>();

  value.forEach((entry, index) => {
    const tag = nonEmptyString(entry);

    if (!tag) {
      addIssue(
        issues,
        `tags[${index}]`,
        "invalid_tag",
        "Tag removed because it is not a non-empty string.",
      );
      return;
    }

    const key = tag.toLowerCase();

    if (seen.has(key)) {
      addIssue(
        issues,
        `tags[${index}]`,
        "duplicate_tag",
        "Duplicate tag removed, preserving its first occurrence.",
      );
      return;
    }

    seen.add(key);
    tags.push(tag);
  });

  return tags;
}

function normalizeIngredients(
  value: unknown,
  recipeId: string,
  issues: NormalizeRecipeIssue[],
): Ingredient[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    addIssue(
      issues,
      "ingredients",
      "invalid_array",
      "ingredients must be an array.",
    );
    return [];
  }

  return value.flatMap((entry, index) => {
    const path = `ingredients[${index}]`;

    if (!isRecord(entry)) {
      addIssue(
        issues,
        path,
        "invalid_ingredient",
        "Ingredient removed because it is not an object.",
      );
      return [];
    }

    const name = nonEmptyString(entry.name);

    if (!name) {
      addIssue(
        issues,
        `${path}.name`,
        "invalid_ingredient_name",
        "Ingredient removed because its name is missing or invalid.",
      );
      return [];
    }

    let id = nonEmptyString(entry.id);

    if (!id) {
      id = deterministicId(recipeId, "ingredient", index);
      addIssue(
        issues,
        `${path}.id`,
        "generated_runtime_id",
        "Generated a deterministic runtime ID for the ingredient.",
      );
    }

    const quantity =
      typeof entry.quantity === "string" ? entry.quantity.trim() : "";
    const unit = typeof entry.unit === "string" ? entry.unit.trim() : "";

    if (hasOwn(entry, "quantity") && typeof entry.quantity !== "string") {
      addIssue(
        issues,
        `${path}.quantity`,
        "invalid_ingredient_quantity",
        "Invalid ingredient quantity replaced with an empty string.",
      );
    }

    if (hasOwn(entry, "unit") && typeof entry.unit !== "string") {
      addIssue(
        issues,
        `${path}.unit`,
        "invalid_ingredient_unit",
        "Invalid ingredient unit replaced with an empty string.",
      );
    }

    return [{ id, quantity, unit, name }];
  });
}

function normalizeSteps(
  value: unknown,
  recipeId: string,
  issues: NormalizeRecipeIssue[],
): RecipeStep[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    addIssue(issues, "steps", "invalid_array", "steps must be an array.");
    return [];
  }

  return value.flatMap((entry, index) => {
    const path = `steps[${index}]`;

    if (!isRecord(entry)) {
      addIssue(
        issues,
        path,
        "invalid_step",
        "Step removed because it is not an object.",
      );
      return [];
    }

    const text = nonEmptyString(entry.text);

    if (!text) {
      addIssue(
        issues,
        `${path}.text`,
        "invalid_step_text",
        "Step removed because its text is missing or invalid.",
      );
      return [];
    }

    let id = nonEmptyString(entry.id);

    if (!id) {
      id = deterministicId(recipeId, "step", index);
      addIssue(
        issues,
        `${path}.id`,
        "generated_runtime_id",
        "Generated a deterministic runtime ID for the step.",
      );
    }

    return [{ id, text }];
  });
}

function normalizePhotos(
  value: unknown,
  issues: NormalizeRecipeIssue[],
): RecipePhoto[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    addIssue(issues, "photos", "invalid_array", "photos must be an array.");
    return [];
  }

  const candidates: Array<RecipePhoto & { originalIndex: number }> = [];

  value.forEach((entry, index) => {
    const path = `photos[${index}]`;

    if (!isRecord(entry)) {
      addIssue(
        issues,
        path,
        "invalid_photo",
        "Photo removed because it is not an object.",
      );
      return;
    }

    const id = nonEmptyString(entry.id);
    const storagePath = nonEmptyString(entry.storagePath);

    if (!id || !storagePath) {
      addIssue(
        issues,
        path,
        "invalid_photo",
        "Photo removed because its ID or storage path is missing or invalid.",
      );
      return;
    }

    candidates.push({ id, storagePath, originalIndex: index });
  });

  const pathsById = new Map<string, Set<string>>();

  candidates.forEach(({ id, storagePath }) => {
    const paths = pathsById.get(id) ?? new Set<string>();
    paths.add(storagePath);
    pathsById.set(id, paths);
  });

  const conflictingIds = new Set(
    [...pathsById.entries()]
      .filter(([, paths]) => paths.size > 1)
      .map(([id]) => id),
  );
  const seenPairs = new Set<string>();

  return candidates.flatMap(({ id, storagePath, originalIndex }) => {
    const path = `photos[${originalIndex}]`;

    if (conflictingIds.has(id)) {
      addIssue(
        issues,
        path,
        "conflicting_photo_id",
        "Photo removed because the same ID points to different storage paths.",
      );
      return [];
    }

    const pairKey = JSON.stringify([id, storagePath]);

    if (seenPairs.has(pairKey)) {
      addIssue(
        issues,
        path,
        "duplicate_photo",
        "Exact duplicate photo removed, preserving its first occurrence.",
      );
      return [];
    }

    seenPairs.add(pairKey);
    return [{ id, storagePath }];
  });
}

function normalizePreparations(
  value: unknown,
  recipeId: string,
  validPhotoIds: ReadonlySet<string>,
  issues: NormalizeRecipeIssue[],
): RecipePreparation[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    addIssue(
      issues,
      "preparations",
      "invalid_array",
      "preparations must be an array.",
    );
    return [];
  }

  return value.flatMap((entry, index) => {
    const path = `preparations[${index}]`;

    if (!isRecord(entry)) {
      addIssue(
        issues,
        path,
        "invalid_preparation",
        "Preparation removed because it is not an object.",
      );
      return [];
    }

    const hasUsefulInput = Boolean(
      nonEmptyString(entry.id) ||
      nonEmptyString(entry.preparedAt) ||
      nonEmptyString(entry.memory) ||
      nonEmptyString(entry.photoId) ||
      entry.outcome === "liked" ||
      entry.outcome === "neutral" ||
      entry.outcome === "disliked",
    );

    if (!hasUsefulInput) {
      addIssue(
        issues,
        path,
        "empty_preparation",
        "Preparation removed because it contains no useful information.",
      );
      return [];
    }

    let id = nonEmptyString(entry.id);

    if (!id) {
      id = deterministicId(recipeId, "preparation", index);
      addIssue(
        issues,
        `${path}.id`,
        "generated_runtime_id",
        "Generated a deterministic runtime ID for the preparation.",
      );
    }

    const rawPreparedAt = nonEmptyString(entry.preparedAt);
    const preparedAt =
      rawPreparedAt && Number.isFinite(new Date(rawPreparedAt).getTime())
        ? rawPreparedAt
        : undefined;

    if (hasOwn(entry, "preparedAt") && !preparedAt) {
      addIssue(
        issues,
        `${path}.preparedAt`,
        "invalid_prepared_at",
        "Invalid preparation date omitted without inventing a replacement.",
      );
    } else if (!hasOwn(entry, "preparedAt")) {
      addIssue(
        issues,
        `${path}.preparedAt`,
        "missing_prepared_at",
        "Preparation has no date; no replacement date was invented.",
      );
    }

    const outcome =
      entry.outcome === "liked" ||
      entry.outcome === "neutral" ||
      entry.outcome === "disliked"
        ? entry.outcome
        : undefined;

    if (hasOwn(entry, "outcome") && entry.outcome !== undefined && !outcome) {
      addIssue(
        issues,
        `${path}.outcome`,
        "invalid_outcome",
        "Invalid preparation outcome omitted.",
      );
    }

    const memory = nonEmptyString(entry.memory);

    if (
      hasOwn(entry, "memory") &&
      entry.memory !== undefined &&
      entry.memory !== null &&
      typeof entry.memory !== "string"
    ) {
      addIssue(
        issues,
        `${path}.memory`,
        "invalid_optional_string",
        "Invalid preparation memory omitted.",
      );
    }

    const candidatePhotoId = nonEmptyString(entry.photoId);
    const photoId =
      candidatePhotoId && validPhotoIds.has(candidatePhotoId)
        ? candidatePhotoId
        : undefined;

    if (candidatePhotoId && !photoId) {
      addIssue(
        issues,
        `${path}.photoId`,
        "dangling_photo_reference",
        "Preparation photo reference omitted because it does not resolve.",
      );
    } else if (
      hasOwn(entry, "photoId") &&
      entry.photoId !== undefined &&
      entry.photoId !== null &&
      !candidatePhotoId
    ) {
      addIssue(
        issues,
        `${path}.photoId`,
        "invalid_photo_reference",
        "Invalid preparation photo reference omitted.",
      );
    }

    return [{ id, preparedAt, outcome, memory, photoId }];
  });
}

function normalizeYield(
  value: unknown,
  issues: NormalizeRecipeIssue[],
): RecipeYield | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    addIssue(issues, "yield", "invalid_object", "yield must be an object.");
    return undefined;
  }

  const quantity = nonEmptyString(value.quantity);
  const unit = nonEmptyString(value.unit);

  if (hasOwn(value, "quantity") && value.quantity != null && typeof value.quantity !== "string") {
    addIssue(issues, "yield.quantity", "invalid_string", "Invalid yield quantity omitted.");
  }

  if (hasOwn(value, "unit") && value.unit != null && typeof value.unit !== "string") {
    addIssue(issues, "yield.unit", "invalid_string", "Invalid yield unit omitted.");
  }

  return quantity || unit ? { quantity, unit } : undefined;
}

function validDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function normalizeTiming(
  value: unknown,
  issues: NormalizeRecipeIssue[],
): RecipeTiming | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    addIssue(issues, "timing", "invalid_object", "timing must be an object.");
    return undefined;
  }

  const prepMinutes = validDuration(value.prepMinutes)
    ? value.prepMinutes
    : undefined;
  const cookMinutes = validDuration(value.cookMinutes)
    ? value.cookMinutes
    : undefined;

  if (hasOwn(value, "prepMinutes") && value.prepMinutes !== undefined && prepMinutes === undefined) {
    addIssue(issues, "timing.prepMinutes", "invalid_duration", "Invalid preparation duration omitted.");
  }

  if (hasOwn(value, "cookMinutes") && value.cookMinutes !== undefined && cookMinutes === undefined) {
    addIssue(issues, "timing.cookMinutes", "invalid_duration", "Invalid cooking duration omitted.");
  }

  let rest: RecipeTiming["rest"];

  if (value.rest !== undefined) {
    if (!isRecord(value.rest)) {
      addIssue(issues, "timing.rest", "invalid_rest", "Invalid rest configuration omitted.");
    } else if (value.rest.overnight === true) {
      rest = { overnight: true };
    } else if (
      validDuration(value.rest.value) &&
      (value.rest.unit === "minutes" || value.rest.unit === "hours")
    ) {
      rest = { value: value.rest.value, unit: value.rest.unit };
    } else {
      addIssue(issues, "timing.rest", "invalid_rest", "Incoherent rest configuration omitted.");
    }
  }

  return prepMinutes !== undefined || cookMinutes !== undefined || rest
    ? { prepMinutes, cookMinutes, rest }
    : undefined;
}

function normalizeSource(
  value: unknown,
  issues: NormalizeRecipeIssue[],
): RecipeSource | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    addIssue(issues, "source", "invalid_object", "source must be an object.");
    return undefined;
  }

  const name = nonEmptyString(value.name);
  const url = nonEmptyString(value.url);

  if (hasOwn(value, "name") && value.name != null && typeof value.name !== "string") {
    addIssue(issues, "source.name", "invalid_string", "Invalid source name omitted.");
  }

  if (hasOwn(value, "url") && value.url != null && typeof value.url !== "string") {
    addIssue(issues, "source.url", "invalid_string", "Invalid source URL text omitted.");
  }

  return name || url ? { name, url } : undefined;
}

export function normalizeRecipe(input: unknown): NormalizeRecipeResult {
  const issues: NormalizeRecipeIssue[] = [];

  if (!isRecord(input)) {
    addIssue(issues, "$", "invalid_recipe", "Recipe must be an object.");
    return { ok: false, recipe: null, issues };
  }

  const id = nonEmptyString(input.id);
  const title = nonEmptyString(input.title);
  const category = nonEmptyString(input.category);

  if (!id) {
    addIssue(issues, "id", "missing_required_string", "Recipe ID is missing or invalid.");
  }

  if (!title) {
    addIssue(issues, "title", "missing_required_string", "Recipe title is missing or invalid.");
  }

  if (!category) {
    addIssue(issues, "category", "missing_required_string", "Recipe category is missing or invalid.");
  }

  if (!id || !title || !category) {
    return { ok: false, recipe: null, issues };
  }

  const photos = normalizePhotos(input.photos, issues);
  const validPhotoIds = new Set(photos.map((photo) => photo.id));
  const preparations = normalizePreparations(
    input.preparations,
    id,
    validPhotoIds,
    issues,
  );
  const status =
    input.status === "saved" || input.status === "tried"
      ? input.status
      : preparations.length > 0
        ? "tried"
        : "saved";

  if (input.status !== "saved" && input.status !== "tried") {
    addIssue(
      issues,
      "status",
      "defaulted_status",
      `Invalid or missing status defaulted to "${status}" based on preserved preparations.`,
    );
  }

  const candidateParentRecipeId = normalizeOptionalString(
    input,
    "parentRecipeId",
    issues,
  );
  const parentRecipeId =
    candidateParentRecipeId === id ? undefined : candidateParentRecipeId;

  if (candidateParentRecipeId === id) {
    addIssue(
      issues,
      "parentRecipeId",
      "self_parent_reference",
      "Self-referencing parent Recipe ID omitted.",
    );
  }

  const candidateCoverPhotoId = nonEmptyString(input.coverPhotoId);
  const coverPhotoId =
    candidateCoverPhotoId && validPhotoIds.has(candidateCoverPhotoId)
      ? candidateCoverPhotoId
      : undefined;

  if (candidateCoverPhotoId && !coverPhotoId) {
    addIssue(
      issues,
      "coverPhotoId",
      "dangling_photo_reference",
      "Cover photo reference omitted because it does not resolve.",
    );
  } else if (
    hasOwn(input, "coverPhotoId") &&
    input.coverPhotoId != null &&
    !candidateCoverPhotoId
  ) {
    addIssue(
      issues,
      "coverPhotoId",
      "invalid_photo_reference",
      "Invalid cover photo reference omitted.",
    );
  }

  const isSpecial =
    typeof input.isSpecial === "boolean" ? input.isSpecial : undefined;

  if (hasOwn(input, "isSpecial") && input.isSpecial !== undefined && typeof input.isSpecial !== "boolean") {
    addIssue(issues, "isSpecial", "invalid_boolean", "Invalid isSpecial flag omitted.");
  }

  const recipe: Recipe = {
    id,
    title,
    parentRecipeId,
    category,
    tags: normalizeTags(input.tags, issues),
    isSpecial,
    memory: normalizeOptionalString(input, "memory", issues),
    status,
    source: normalizeSource(input.source, issues),
    notes: normalizeOptionalString(input, "notes", issues),
    servings: normalizeOptionalString(input, "servings", issues),
    yield: normalizeYield(input.yield, issues),
    timing: normalizeTiming(input.timing, issues),
    ingredients: normalizeIngredients(input.ingredients, id, issues),
    steps: normalizeSteps(input.steps, id, issues),
    photos,
    coverPhotoId,
    preparations,
  };

  return { ok: true, recipe, issues };
}
