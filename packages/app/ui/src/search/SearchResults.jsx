import Grid, { GridItem } from "../layout/Grid.jsx";
import AnnotationCard from "../layout/AnnotationCard.jsx";
import Card from "../layout/Card.jsx";
import React from "react";

export default function SearchResults({
  results = [],
  type = "all",
  layout = "grid",
  query = "",
}) {
  if (!results.length) {
    return (
      <div className="text-slate-600">
        <em>No results</em>
      </div>
    );
  }

  const isAnnotationView = String(type).toLowerCase() === "annotation";
  if (isAnnotationView) {
    return (
      <div id="search-results" className="space-y-4">
        {results.map((r, i) => {
          if (!r || !r.annotation) return null;
          return (
            <AnnotationCard
              key={r.id || i}
              href={r.href}
              title={r.title || r.href || "Untitled"}
              annotation={r.annotation}
              summary={r.summary}
              metadata={Array.isArray(r.metadata) ? r.metadata : []}
              query={query}
            />
          );
        })}
      </div>
    );
  }

  if (layout === "list") {
    return (
      <ul id="search-results" className="space-y-3">
        {results.map((r, i) => {
          const hasDims =
            Number.isFinite(Number(r.thumbnailWidth)) &&
            Number(r.thumbnailWidth) > 0 &&
            Number.isFinite(Number(r.thumbnailHeight)) &&
            Number(r.thumbnailHeight) > 0;
          const aspect = hasDims
            ? Number(r.thumbnailWidth) / Number(r.thumbnailHeight)
            : undefined;
          return (
            <li
              key={i}
              className={`search-result ${r.type}`}
              data-thumbnail-aspect-ratio={aspect}
            >
              <Card
                href={r.href}
                title={r.title || r.href}
                src={r.type === "work" ? r.thumbnail : undefined}
                imgWidth={r.thumbnailWidth}
                imgHeight={r.thumbnailHeight}
                aspectRatio={aspect}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  // Default: grid (masonry)
  return (
    <div id="search-results">
      <Grid>
        {results.map((r, i) => {
          const hasDims =
            Number.isFinite(Number(r.thumbnailWidth)) &&
            Number(r.thumbnailWidth) > 0 &&
            Number.isFinite(Number(r.thumbnailHeight)) &&
            Number(r.thumbnailHeight) > 0;
          const aspect = hasDims
            ? Number(r.thumbnailWidth) / Number(r.thumbnailHeight)
            : undefined;
          return (
            <GridItem
              key={i}
              className={`search-result ${r.type}`}
              data-thumbnail-aspect-ratio={aspect}
            >
              <Card
                href={r.href}
                title={r.title || r.href}
                src={r.type === "work" ? r.thumbnail : undefined}
                imgWidth={r.thumbnailWidth}
                imgHeight={r.thumbnailHeight}
                aspectRatio={aspect}
              />
            </GridItem>
          );
        })}
      </Grid>
    </div>
  );
}
