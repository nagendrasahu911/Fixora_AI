export type SavedProject = {
  id: string;
  name: string;
  code: string;
  language: string;
  date: string;
};

const KEY = "fixora.projects";

export function loadProjects(): SavedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedProject[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list: SavedProject[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function saveProject(name: string, code: string, language = "python"): SavedProject[] {
  const project: SavedProject = {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled project",
    code,
    language,
    date: new Date().toISOString(),
  };
  return persist([project, ...loadProjects()].slice(0, 100));
}

export function deleteProject(id: string): SavedProject[] {
  return persist(loadProjects().filter((p) => p.id !== id));
}
