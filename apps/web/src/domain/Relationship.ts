import type { RelationshipType } from "./RelationshipType";

export type Relationship = {
  id: string;
  type: RelationshipType;
  title: string;
};