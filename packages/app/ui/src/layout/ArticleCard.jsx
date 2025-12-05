import React, {useMemo} from "react";

function escapeRegExp(str = "") {
  return String(str).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function buildSnippet({text = "", query = "", maxLength = 360}) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  const safeMax = Math.max(60, Number(maxLength) || 360);
  const term = String(query || "").trim();
  if (!term)
    return clean.length > safeMax ? clean.slice(0, safeMax).trimEnd() + "…" : clean;
  const lower = clean.toLowerCase();
  const termLower = term.toLowerCase();
  const idx = lower.indexOf(termLower);
  if (idx === -1)
    return clean.length > safeMax ? clean.slice(0, safeMax).trimEnd() + "…" : clean;
  const padding = Math.max(0, Math.floor((safeMax - term.length) / 2));
  let start = Math.max(0, idx - padding);
  let end = start + safeMax;
  if (end > clean.length) {
    end = clean.length;
    start = Math.max(0, end - safeMax);
  }
  let snippet = clean.slice(start, end).trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < clean.length) snippet = snippet + "…";
  return snippet;
}

function highlightTextNode(text, query, keyPrefix = "") {
  if (!query) return text;
  const term = String(query).trim();
  if (!term) return text;
  const regex = new RegExp(`(${escapeRegExp(term)})`, "gi");
  const parts = String(text).split(regex);
  const termLower = term.toLowerCase();
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.toLowerCase() === termLower) {
      return (
        <mark key={`${keyPrefix}-${idx}`}>
          {part}
        </mark>
      );
    }
    return (
      <React.Fragment key={`${keyPrefix}-${idx}`}>
        {part}
      </React.Fragment>
    );
  });
}

function tokenizeInlineMarkdown(input = "") {
  const tokens = [];
  let text = input;
  while (text.length) {
    if (text.startsWith("\n")) {
      tokens.push({type: "break"});
      text = text.slice(1);
      continue;
    }
    if (text.startsWith("**")) {
      const closing = text.indexOf("**", 2);
      if (closing !== -1) {
        const inner = text.slice(2, closing);
        tokens.push({type: "strong", children: tokenizeInlineMarkdown(inner)});
        text = text.slice(closing + 2);
        continue;
      }
    }
    if (text.startsWith("__")) {
      const closing = text.indexOf("__", 2);
      if (closing !== -1) {
        const inner = text.slice(2, closing);
        tokens.push({type: "strong", children: tokenizeInlineMarkdown(inner)});
        text = text.slice(closing + 2);
        continue;
      }
    }
    if (text.startsWith("*")) {
      if (!text.startsWith("**")) {
        const closing = text.indexOf("*", 1);
        if (closing !== -1) {
          const inner = text.slice(1, closing);
          tokens.push({type: "em", children: tokenizeInlineMarkdown(inner)});
          text = text.slice(closing + 1);
          continue;
        }
      }
    }
    if (text.startsWith("_")) {
      if (!text.startsWith("__")) {
        const closing = text.indexOf("_", 1);
        if (closing !== -1) {
          const inner = text.slice(1, closing);
          tokens.push({type: "em", children: tokenizeInlineMarkdown(inner)});
          text = text.slice(closing + 1);
          continue;
        }
      }
    }
    if (text.startsWith("`")) {
      const closing = text.indexOf("`", 1);
      if (closing !== -1) {
        const inner = text.slice(1, closing);
        tokens.push({type: "code", value: inner});
        text = text.slice(closing + 1);
        continue;
      }
    }
    if (text.startsWith("[")) {
      const endLabel = text.indexOf("]");
      const startHref = endLabel !== -1 ? text.indexOf("(", endLabel) : -1;
      const endHref = startHref !== -1 ? text.indexOf(")", startHref) : -1;
      if (endLabel !== -1 && startHref === endLabel + 1 && endHref !== -1) {
        const label = text.slice(1, endLabel);
        const href = text.slice(startHref + 1, endHref);
        tokens.push({
          type: "link",
          href,
          children: tokenizeInlineMarkdown(label),
        });
        text = text.slice(endHref + 1);
        continue;
      }
    }
    const specials = ["**", "__", "*", "_", "`", "[", "\n"];
    const nextIndex = specials
      .map((needle) => (needle === "\n" ? text.indexOf("\n") : text.indexOf(needle)))
      .filter((idx) => idx > 0)
      .reduce((min, idx) => (min === -1 || idx < min ? idx : min), -1);
    if (nextIndex === -1) {
      tokens.push({type: "text", value: text});
      break;
    }
    tokens.push({type: "text", value: text.slice(0, nextIndex)});
    text = text.slice(nextIndex);
  }
  return tokens;
}

function renderMarkdownTokens(tokens, query, keyPrefix = "token") {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (token.type) {
      case "strong":
        return (
          <strong key={key}>{renderMarkdownTokens(token.children || [], query, key)}</strong>
        );
      case "em":
        return (
          <em key={key}>{renderMarkdownTokens(token.children || [], query, key)}</em>
        );
      case "code":
        return (
          <code key={key}>{token.value}</code>
        );
      case "link":
        return (
          <a key={key} href={token.href} target="_blank" rel="noreferrer">
            {renderMarkdownTokens(token.children || [], query, key)}
          </a>
        );
      case "break":
        return <br key={key} />;
      case "text":
      default:
        return (
          <React.Fragment key={key}>
            {highlightTextNode(token.value || "", query, key)}
          </React.Fragment>
        );
    }
  });
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
  summaryMarkdown = "",
  metadata = [],
  query = "",
}) {
  const snippetSource = summaryMarkdown || annotation || summary;
  const snippet = useMemo(
    () => buildSnippet({text: snippetSource, query}),
    [snippetSource, query]
  );
  const snippetTokens = useMemo(
    () => tokenizeInlineMarkdown(snippet),
    [snippet]
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
          <p className="canopy-article-card__snippet">
            {renderMarkdownTokens(snippetTokens, query)}
          </p>
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
