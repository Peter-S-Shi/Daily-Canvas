import { db } from "../db";
import type { SearchResult } from "../types";

const includes = (value: string | undefined, query: string) => value?.toLocaleLowerCase().includes(query) ?? false;
const excerpt = (value: string | undefined) => value?.trim().slice(0, 160) || undefined;

export async function globalSearch(rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return [];
  const [tasks, reflections, meditations, areas] = await Promise.all([db.tasks.toArray(), db.dailyReflections.toArray(), db.meditationEntries.toArray(), db.areas.toArray()]);
  return [
    ...tasks.filter((item) => includes(item.title, query) || includes(item.notes, query)).map((item): SearchResult => ({ type: "task", id: item.id, title: item.title, excerpt: includes(item.notes, query) ? excerpt(item.notes) : undefined })),
    ...reflections.filter((item) => includes(item.note, query)).map((item): SearchResult => ({ type: "reflection", id: item.date, title: item.date, excerpt: excerpt(item.note) })),
    ...meditations.filter((item) => includes(item.content, query)).map((item): SearchResult => ({ type: "meditation", id: item.id, title: excerpt(item.content) ?? item.id, excerpt: excerpt(item.content) })),
    ...areas.filter((item) => includes(item.name, query)).map((item): SearchResult => ({ type: "area", id: item.id, title: item.name })),
  ];
}
