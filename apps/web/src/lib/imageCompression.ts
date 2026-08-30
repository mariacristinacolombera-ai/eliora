import { RECIPE_PHOTO_MAX_BYTES } from "./recipePhotosRepository";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);

const SUPPORTED_IMAGE_FILE_EXTENSION = /\.(?:jpe?g|png|webp)$/i;

const COMPRESSION_ATTEMPTS = [
  { maxLongSide: 1920, quality: 82 },
  { maxLongSide: 1920, quality: 72 },
  { maxLongSide: 1920, quality: 62 },
  { maxLongSide: 1600, quality: 62 },
  { maxLongSide: 1280, quality: 58 },
] as const;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function loadImage(source: Blob, objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";

    image.onload = () => {
      image.onload = null;
      image.onerror = null;
      resolve(image);
    };

    image.onerror = () => {
      image.onload = null;
      image.onerror = null;
      reject(
        new Error(
          `Unable to decode recipe photo with type "${source.type}"`,
        ),
      );
    };

    image.src = objectUrl;
  });
}

function createResizedImageData(
  image: HTMLImageElement,
  maxLongSide: number,
): ImageData {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Decoded recipe photo has invalid dimensions");
  }

  const scale = Math.min(
    1,
    maxLongSide / Math.max(sourceWidth, sourceHeight),
  );
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d", {
    alpha: true,
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error("Unable to create a canvas context for recipe photo");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  try {
    return context.getImageData(0, 0, targetWidth, targetHeight);
  } catch (error) {
    throw new Error(
      `Unable to read resized recipe photo pixels: ${getErrorMessage(error)}`,
    );
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }
}

export async function compressRecipePhoto(
  source: File | Blob,
): Promise<Blob> {
  const normalizedType = source.type.trim().toLowerCase();
  const hasSupportedType = SUPPORTED_IMAGE_TYPES.has(normalizedType);
  const hasSupportedFileExtension =
    normalizedType === "" &&
    source instanceof File &&
    SUPPORTED_IMAGE_FILE_EXTENSION.test(source.name);

  if (!hasSupportedType && !hasSupportedFileExtension) {
    throw new Error(
      `Unsupported recipe photo type "${source.type || "unknown"}". Use JPEG, PNG, or WebP.`,
    );
  }

  const objectUrl = URL.createObjectURL(source);
  let image: HTMLImageElement | undefined;

  try {
    image = await loadImage(source, objectUrl);

    let currentMaxLongSide: number | undefined;
    let imageData: ImageData | undefined;
    let encodeWebp: typeof import("@jsquash/webp/encode.js").default;

    try {
      ({ default: encodeWebp } = await import("@jsquash/webp/encode.js"));
    } catch (error) {
      throw new Error(
        `Unable to load the WebP encoder: ${getErrorMessage(error)}`,
      );
    }

    for (const attempt of COMPRESSION_ATTEMPTS) {
      if (currentMaxLongSide !== attempt.maxLongSide || !imageData) {
        imageData = createResizedImageData(image, attempt.maxLongSide);
        currentMaxLongSide = attempt.maxLongSide;
      }

      let encodedPhoto: ArrayBuffer;

      try {
        encodedPhoto = await encodeWebp(imageData, {
          quality: attempt.quality,
          alpha_quality: 100,
        });
      } catch (error) {
        throw new Error(
          `Unable to encode recipe photo as WebP: ${getErrorMessage(error)}`,
        );
      }

      if (encodedPhoto.byteLength === 0) {
        throw new Error("WebP encoder returned an empty recipe photo");
      }

      const output = new Blob([encodedPhoto], { type: "image/webp" });

      if (output.size <= RECIPE_PHOTO_MAX_BYTES) {
        return output;
      }
    }

    throw new Error(
      "Unable to compress recipe photo below the 5 MiB size limit",
    );
  } finally {
    if (image) {
      image.onload = null;
      image.onerror = null;
      image.src = "";
    }

    URL.revokeObjectURL(objectUrl);
  }
}
