import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { globalSearch } from "../services/searchService";
import type { SearchResult } from "../types";
import { Dialog, DialogHeader } from "./Dialog";

export function SearchDialog({ onClose, onSelect }: { onClose: () => void; onSelect: (result: SearchResult) => void }) {
  const { t } = useTranslation(); const [query, setQuery] = useState(""); const [results, setResults] = useState<SearchResult[]>([]); const [active, setActive] = useState(0);
  useEffect(() => { let live = true; void globalSearch(query).then((value) => { if (live) { setResults(value); setActive(0); } }); return () => { live = false; }; }, [query]);
  const key = (event: React.KeyboardEvent) => { if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(results.length - 1, value + 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); } if (event.key === "Enter" && results[active]) { event.preventDefault(); onSelect(results[active]); } };
  return <Dialog labelledBy="search-title" onClose={onClose}><div className="dialog-body search-dialog"><DialogHeader id="search-title" title={t("search")} onClose={onClose} closeLabel={t("close")}/><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={key} placeholder={t("searchPlaceholder")} aria-label={t("search")}/>{query && results.length === 0 && <p className="muted">{t("noLocalResults")}</p>}<div className="search-results">{results.map((result, index) => <button type="button" key={`${result.type}:${result.id}`} className={index === active ? "search-result active" : "search-result"} onMouseEnter={() => setActive(index)} onClick={() => onSelect(result)}><span className="pill">{t(`search_${result.type}`)}</span><span><strong>{result.title}</strong>{result.excerpt && <small>{result.excerpt}</small>}</span></button>)}</div></div></Dialog>;
}
