import React, {useMemo} from "react";

function escapeRegExp(str = "") {
  return String(str).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function buildSnippet({text = "", query = "", maxLength = 240}) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  const term = String(query || "").trim();
  if (!term)
    return clean.length > maxLength ? clean.slice(0, maxLength) + "…" : clean;
  const lower = clean.toLowerCase();
  const termLower = term.toLowerCase();
  const idx = lower.indexOf(termLower);
  if (idx === -1) {
    return clean.length > maxLength ? clean.slice(0, maxLength) + "…" : clean;
  }
  const context = Math.max(0, maxLength / 2);
  const start = Math.max(0, idx - context);
  const end = Math.min(clean.length, idx + term.length + context);
  let snippet = clean.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < clean.length) snippet = snippet + "…";
  return snippet;
}

function highlightSnippet(snippet, query) {
  if (!query) return snippet;
  const term = String(query).trim();
  if (!term) return snippet;
  const parts = String(snippet).split(
    new RegExp(`(${escapeRegExp(term)})`, "gi")
  );
  const termLower = term.toLowerCase();
  return parts.map((part, idx) =>
    part.toLowerCase() === termLower ? (
      <mark key={idx}>{part}</mark>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

function formatDisplayUrl(href = "") {
  try {
    const url = new URL(href, href.startsWith("http") ? undefined : "http://example.com");
    if (!href.startsWith("http")) return href;
    const displayPath = url.pathname.replace(/\/$/, "");
    return `${url.host}${displayPath}${url.search}`.replace(/\/$/, "");
  } catch (_) {
    return href;
  }
}

export default function ArticleCard({
  href = "#",
  title = "Untitled",
  annotation = "",
  summary = "",
  metadata = [],
  query = "",
}) {
  const snippetSource = annotation || summary;
  const snippet = useMemo(
    () => buildSnippet({text: snippetSource, query}),
    [snippetSource, query]
  );
  const highlighted = useMemo(
    () => highlightSnippet(snippet, query),
    [snippet, query]
  );
  const metaList = Array.isArray(metadata)
    ? metadata.map((m) => String(m || "")).filter(Boolean)
    : [];
  const displayUrl = useMemo(() => formatDisplayUrl(href), [href]);

  return (
    <a href={href} className="canopy-article-card">
      <article>
        {displayUrl ? (
          <p className="canopy-article-card__url">{displayUrl}</p>
        ) : null}
        <h3>{title}</h3>
        {snippet ? (
          <p className="canopy-article-card__snippet">{highlighted}</p>
        ) : null}
        {metaList.length ? (
          <ul className="canopy-article-card__meta">
            {metaList.slice(0, 3).map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        ) : null}
      </article>
    </a>
  );
}
