export type ProjectStatus = "in_progress" | "completed";

export type PatternViewerState = { page?: number; scrollPosition?: number };

export type ProjectPattern =
  | { type: "web"; title?: string; url: string; sourceUrl?: string; viewerState?: PatternViewerState }
  | { type: "pdf"; title?: string; fileId?: string; url?: string; sourceUrl?: string; viewerState?: PatternViewerState }
  | { type: "image"; title?: string; fileIds: string[]; sourceUrl?: string; viewerState?: PatternViewerState };

export type ProjectYarnQuantity = { amount: number; unit: "g" | "skeins" };
export type ProjectYarn = {
  id: string;
  name: string;
  color?: string;
  recommendedQuantity?: ProjectYarnQuantity;
  usedQuantity?: ProjectYarnQuantity;
};
export type ProjectNeedle = { id: string; sizeMm: number; purpose?: string };
export type ProjectCounter = { value: number; target?: number };
export type ProjectSecondaryCounter = { value: number; resetEvery?: number };
export type ProjectWorkState = {
  phase?: string;
  instruction?: string;
  // Current operational count; resets do not imply history or a phase change.
  primaryCounter: ProjectCounter;
  secondaryCounter?: ProjectSecondaryCounter;
};
export type ProjectUpdate = { id: string; createdAt?: string; text?: string; photoId?: string };
export type ProjectCompletion = { finalPhotoId?: string; resultNotes?: string; blockingNotes?: string };

export type Project = {
  id: string;
  title: string;
  status: ProjectStatus;
  // Imported/read data may have no usable date. Never fabricate one.
  startedAt?: string;
  completedAt?: string;
  description?: string;
  pattern?: ProjectPattern;
  selectedSize?: string;
  yarns?: ProjectYarn[];
  needles?: ProjectNeedle[];
  workState: ProjectWorkState;
  updates?: ProjectUpdate[];
  completion?: ProjectCompletion;
};
