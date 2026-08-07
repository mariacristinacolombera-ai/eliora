import type { Recipe } from "../../../domain/Recipe";

export const recipes = [
  {
    id: "cotolette-di-lenticchie",
    title: "Cotolette di lenticchie",
    category: "Secondo",
    tags: ["Vegetariana", "Congelabile"],
    isSpecial: true,
    memory:
      "Andrea ha detto che non gli piacevano, ma ne ha mangiate due.",
  },
  {
    id: "wurstel-di-tofu",
    title: "Würstel di tofu",
    category: "Secondo",
    tags: ["Vegetariana"],
    memory: "Una porzione da 150 g vale come secondo completo.",
  },
] satisfies Recipe[];