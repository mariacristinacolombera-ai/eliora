import type { RecipePreparation } from "../domain/Recipe";

function preparationTimestamp(preparation: RecipePreparation): number {
  const timestamp = new Date(preparation.preparedAt).getTime();

  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function getPreparationsByRecency(
  preparations?: readonly RecipePreparation[],
): RecipePreparation[] {
  return [...(preparations ?? [])].sort((a, b) => {
    const aTimestamp = preparationTimestamp(a);
    const bTimestamp = preparationTimestamp(b);

    if (aTimestamp === bTimestamp) {
      return 0;
    }

    return bTimestamp > aTimestamp ? 1 : -1;
  });
}

export function getLatestPreparation(
  preparations?: readonly RecipePreparation[],
): RecipePreparation | undefined {
  const latestPreparation = getPreparationsByRecency(preparations)[0];

  return latestPreparation &&
    Number.isFinite(new Date(latestPreparation.preparedAt).getTime())
    ? latestPreparation
    : undefined;
}
