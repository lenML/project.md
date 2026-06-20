export interface CheckboxItem {
  text: string;
  checked: boolean;
  hash: string;
}

export interface CardData {
  name: string;
  path: string;
  meta: Record<string, unknown>;
  body: string;
  checkboxes: CheckboxItem[];
  order?: number;
  mtime_ms?: number;
}

export interface ColumnData {
  name: string;
  cards: CardData[];
  readme?: string;
  order?: number;
}

export interface KanbanData {
  name: string;
  columns: ColumnData[];
}

export interface ProjectData {
  name: string;
  kanbans: KanbanData[];
  readme?: string;
}

export interface EventRecord {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  content?: string;
  meta?: Record<string, unknown>;
}

export interface ViewState {
  project: string | null;
  kanban: string | null;
  card: CardData | null;
  logOpen: boolean;
}
