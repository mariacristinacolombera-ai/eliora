import type { Relationship } from "./Relationship";

export type CurrentJourney = {
  relationship: Relationship;
  lastStep: string;
  nextStep: string;
  nextActionAt: Date;
};