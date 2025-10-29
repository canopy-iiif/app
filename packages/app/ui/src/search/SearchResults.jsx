import Grid, { GridItem } from "../layout/Grid.jsx";
import TextCard from "../layout/TextCard.jsx";
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

  const normalizedType = String(type || 'all').toLowerCase();
  const isAnnotationView = normalizedType === "annotation";
  if (isAnnotationView) {
    return (
      <div id="search-results" className="space-y-4">
        {results.map((r, i) => {
          if (!r) return null;
          return renderTextCard(r, r.id || i);
        })}
      </div>
    );
  }

  const renderTextCard = (record, key) => {
    if (!record) return null;
    return (
      <TextCard
        key={key}
        href={record.href}
        title={record.title || record.href || 'Untitled'}
        annotation={record.annotation}
        summary={record.summary || record.summaryValue || ''}
        metadata={Array.isArray(record.metadata) ? record.metadata : []}
        query={query}
      />
    );
  };

  const isWorkRecord = (record) => String(record && record.type).toLowerCase() === 'work';

  const shouldRenderAsTextCard = (record) =>
    !isWorkRecord(record) || normalizedType !== 'work';

  if (layout === "list") {
    return (
      <ul id="search-results" className="space-y-3">
        {results.map((r, i) => {
          if (shouldRenderAsTextCard(r)) {
            return (
              <li key={i} className={`search-result ${r && r.type}`}>
                {renderTextCard(r, i)}
              </li>
            );
          }
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
          if (shouldRenderAsTextCard(r)) {
            return (
              <GridItem key={i} className={`search-result ${r && r.type}`}>
                {renderTextCard(r, i)}
              </GridItem>
            );
          }
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
