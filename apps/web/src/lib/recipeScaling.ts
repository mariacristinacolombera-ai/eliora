import type { Ingredient } from "../domain/Recipe";

export function parseQuantity(
  value: string,
): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("/")) {
    const [numerator, denominator] = trimmed
      .split("/")
      .map(Number);

    if (
      Number.isFinite(numerator) &&
      Number.isFinite(denominator) &&
      denominator !== 0
    ) {
      return numerator / denominator;
    }

    return null;
  }

  const parsed = Number(
    trimmed.replace(",", "."),
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function formatQuantity(value: number): string {
  const rounded =
    Math.round(value * 100) / 100;

  return String(rounded).replace(".", ",");
}

export function scaleIngredients(
  ingredients: Ingredient[],
  factor: number,
): Ingredient[] {
  return ingredients.map((ingredient) => {
    const numericQuantity =
      parseQuantity(ingredient.quantity);

    if (numericQuantity === null) {
      return ingredient;
    }

    return {
      ...ingredient,
      quantity: formatQuantity(
        numericQuantity * factor,
      ),
    };
  });
}