import type { RecipePreparation } from "../domain/Recipe";

function preparationTimestamp(preparation: RecipePreparation): number {
  const timestamp = preparation.preparedAt
    ? new Date(preparation.preparedAt).getTime()
    : Number.NaN;

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
): (RecipePreparation & { preparedAt: string }) | undefined {
  const latestPreparation = getPreparationsByRecency(preparations)[0];

  return latestPreparation &&
    typeof latestPreparation.preparedAt === "string" &&
    Number.isFinite(new Date(latestPreparation.preparedAt).getTime())
    ? (latestPreparation as RecipePreparation & { preparedAt: string })
    : undefined;
}
