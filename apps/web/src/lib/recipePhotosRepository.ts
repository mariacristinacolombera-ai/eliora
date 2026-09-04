import type { Recipe, RecipePhoto } from "../domain/Recipe";
import { supabase } from "./supabase";
import { loadRecipeFromSupabase } from "./recipesRepository";

export const RECIPE_PHOTOS_BUCKET = "recipe-photos";
export const RECIPE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const RECIPE_PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;

function assertPathSegment(value: string, label: string): void {
  if (!value || value.includes("/") || value.includes("\\")) {
    throw new Error(`Invalid ${label}`);
  }
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("User not authenticated");
  }

  return user.id;
}

function assertPathsBelongToUser(
  storagePaths: string[],
  userId: string,
): void {
  const expectedPrefix = `${userId}/`;

  if (
    storagePaths.some(
      (storagePath) => !storagePath.startsWith(expectedPrefix),
    )
  ) {
    throw new Error("Recipe photo path does not belong to the current user");
  }
}

export function createRecipePhotoId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues !== "function") {
    throw new Error("Secure random photo ID generation is not available");
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hexadecimal = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return [
    hexadecimal.slice(0, 8),
    hexadecimal.slice(8, 12),
    hexadecimal.slice(12, 16),
    hexadecimal.slice(16, 20),
    hexadecimal.slice(20),
  ].join("-");
}

export function buildRecipePhotoStoragePath(
  userId: string,
  recipeId: string,
  photoId: string,
): string {
  assertPathSegment(userId, "user id");
  assertPathSegment(recipeId, "recipe id");
  assertPathSegment(photoId, "photo id");

  return `${userId}/${recipeId}/${photoId}.webp`;
}

export async function createRecipePhotoUploadTarget(
  recipeId: string,
): Promise<RecipePhoto> {
  const userId = await getAuthenticatedUserId();
  const photoId = createRecipePhotoId();

  return {
    id: photoId,
    storagePath: buildRecipePhotoStoragePath(userId, recipeId, photoId),
  };
}

type UploadRecipePhotoInput = {
  photo: RecipePhoto;
  file: Blob;
};

export async function uploadRecipePhoto({
  photo,
  file,
}: UploadRecipePhotoInput): Promise<RecipePhoto> {
  if (file.type !== "image/webp") {
    throw new Error("Recipe photos must be WebP images");
  }

  if (file.size > RECIPE_PHOTO_MAX_BYTES) {
    throw new Error("Recipe photo exceeds the 5 MiB size limit");
  }

  const userId = await getAuthenticatedUserId();
  assertPathsBelongToUser([photo.storagePath], userId);

  const { error } = await supabase.storage
    .from(RECIPE_PHOTOS_BUCKET)
    .upload(photo.storagePath, file, {
      contentType: "image/webp",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return photo;
}

function recipeReferencesPhoto(recipe: unknown, photoId: string): boolean {
  if (!recipe || typeof recipe !== "object") {
    return false;
  }

  const candidate = recipe as {
    coverPhotoId?: unknown;
    photos?: Array<{ id?: unknown }>;
    preparations?: Array<{ photoId?: unknown }>;
  };

  return (
    candidate.coverPhotoId === photoId ||
    (Array.isArray(candidate.photos) &&
      candidate.photos.some((photo) => photo?.id === photoId)) ||
    (Array.isArray(candidate.preparations) &&
      candidate.preparations.some(
        (preparation) => preparation?.photoId === photoId,
      ))
  );
}

export async function compensateRecipePhotoAfterFailedSave(
  recipeId: string,
  photo: RecipePhoto,
): Promise<void> {
  let remoteResult;

  try {
    remoteResult = await loadRecipeFromSupabase(recipeId);
  } catch (error) {
    console.error(
      "Recipe photo cleanup left uncertain: unable to verify the remote Recipe; preserving the potentially referenced file.",
      { recipeId, photoId: photo.id, storagePath: photo.storagePath, error },
    );
    return;
  }

  if (remoteResult.status === "invalid") {
    console.error(
      "Recipe photo cleanup left uncertain: the remote Recipe payload is invalid; preserving the potentially referenced file.",
      {
        recipeId,
        photoId: photo.id,
        storagePath: photo.storagePath,
        issues: remoteResult.issues,
      },
    );
    return;
  }

  if (
    remoteResult.status === "found" &&
    recipeReferencesPhoto(remoteResult.recipe, photo.id)
  ) {
    console.info(
      "Recipe photo cleanup skipped: the remote Recipe already references the uploaded photo.",
      { recipeId, photoId: photo.id, storagePath: photo.storagePath },
    );
    return;
  }

  try {
    await removeRecipePhotos([photo.storagePath]);
  } catch (error) {
    console.error(
      "Recipe photo cleanup left uncertain: the remote Recipe does not reference the photo, but Storage deletion failed.",
      { recipeId, photoId: photo.id, storagePath: photo.storagePath, error },
    );
  }
}

export async function removeRecipePhotos(
  storagePaths: string[],
): Promise<void> {
  const uniquePaths = [...new Set(storagePaths)];

  if (uniquePaths.length === 0) {
    return;
  }

  const userId = await getAuthenticatedUserId();
  assertPathsBelongToUser(uniquePaths, userId);

  const { error } = await supabase.storage
    .from(RECIPE_PHOTOS_BUCKET)
    .remove(uniquePaths);

  if (error) {
    throw error;
  }
}

export function getRecipePhotoStoragePaths(
  recipe: Pick<Recipe, "photos">,
): string[] {
  if (!Array.isArray(recipe.photos)) {
    return [];
  }

  return [
    ...new Set(
      recipe.photos.flatMap((photo) =>
        photo &&
        typeof photo.storagePath === "string" &&
        photo.storagePath.length > 0
          ? [photo.storagePath]
          : [],
      ),
    ),
  ];
}

export async function createRecipePhotoSignedUrls(
  storagePaths: string[],
  expiresIn = RECIPE_PHOTO_SIGNED_URL_TTL_SECONDS,
): Promise<Record<string, string>> {
  const uniquePaths = [...new Set(storagePaths)];

  if (uniquePaths.length === 0) {
    return {};
  }

  if (!Number.isInteger(expiresIn) || expiresIn <= 0) {
    throw new Error("Signed URL expiry must be a positive integer");
  }

  const userId = await getAuthenticatedUserId();
  assertPathsBelongToUser(uniquePaths, userId);

  const { data, error } = await supabase.storage
    .from(RECIPE_PHOTOS_BUCKET)
    .createSignedUrls(uniquePaths, expiresIn);

  if (error) {
    throw error;
  }

  if (data.length !== uniquePaths.length) {
    throw new Error(
      `Failed to create recipe photo signed URLs: expected ${uniquePaths.length} results, received ${data.length}`,
    );
  }

  const signedUrls: Record<string, string> = {};

  data.forEach((result, index) => {
    if (
      result.error ||
      result.path === null ||
      result.signedUrl === null
    ) {
      const storagePath = result.path ?? uniquePaths[index] ?? "unknown";
      const reason = result.error ?? "missing path or signed URL";

      throw new Error(
        `Failed to create signed URL for recipe photo "${storagePath}" at batch index ${index}: ${reason}`,
      );
    }

    signedUrls[result.path] = result.signedUrl;
  });

  return signedUrls;
}
