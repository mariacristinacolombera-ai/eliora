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
    status: "tried",
    ingredients: [],
    steps: [],
       preparations: [],
  },
  {
    id: "wurstel-di-tofu",
    title: "Würstel di tofu",
    category: "Secondo",
    tags: ["Vegetariana"],
    memory: "Una porzione da 150 g vale come secondo completo.",
    status: "tried",
    ingredients: [],
    steps: [],
    preparations: [],
  },
  {
  id: "pizza-in-teglia",
  title: "Pizza in teglia",
  category: "Pane",
  tags: [],
  memory: "Molto leggera, spazzolata dagli ospiti.",
  status: "tried",
  ingredients: [],
  steps: [],
  preparations: [],
  },
] satisfies Recipe[];