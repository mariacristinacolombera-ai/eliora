import type { CurrentJourney } from "../domain/CurrentJourney";

export const currentJourney = {
  relationship: {
    id: "pizza-in-teglia",
    type: "recipe",
    title: "Pizza in teglia",
  },
  lastStep: "Ieri hai messo l'impasto in frigorifero.",
  nextStep: "Tira fuori l'impasto.",
  nextActionAt: new Date("2026-08-05T16:30:00+02:00"),
} satisfies CurrentJourney;