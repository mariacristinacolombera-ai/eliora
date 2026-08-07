export type Recipe = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  isSpecial?: boolean;
  memory?: string;
};