import React from "react";
import navigationHelpers from "../../../lib/components/navigation.js";

function getPageContext() {
  if (!navigationHelpers || typeof navigationHelpers.getPageContext !== "function") {
    return null;
  }
  try {
    return navigationHelpers.getPageContext();
  } catch (_) {
    return null;
  }
}

function resolveReferences(manifestId, contextList) {
  if (contextList && contextList.length) return contextList;
  if (!manifestId) return [];
  try {
    return referenced.getReferencesForManifest(manifestId);
  } catch (_) {
    return [];
  }
}

export default function References({
  id = "",
  title = "Referenced by",
  emptyLabel = null,
  className = "",
  children,
  ...rest
}) {
  const PageContext = getPageContext();
  const context = PageContext ? React.useContext(PageContext) : null;
  const contextPage = context && context.page ? context.page : null;
  const manifestId = id || (contextPage && contextPage.manifestId) || "";
  const contextReferences = !id && contextPage && Array.isArray(contextPage.referencedBy)
    ? contextPage.referencedBy
    : null;
  const references = resolveReferences(manifestId, contextReferences);

  if (!manifestId) return null;

  const entries = references && references.length ? references : null;
  if (!entries || !entries.length) return null;

  const containerClass = ["references", className].filter(Boolean).join(" ");

  return (
    <dl className={containerClass} {...rest}>
      <div className="references__group">
        <dt>{title}</dt>
        {entries.map((entry) => (
          <dd key={entry.href} className="references__item">
            <a href={entry.href}>{entry.title || entry.href}</a>
          </dd>
        ))}
      </div>
    </dl>
  );
}
