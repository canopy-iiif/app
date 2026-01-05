import React from "react";
import TeaserCard from "./TeaserCard.jsx";

function normalizeMetadata(metadata, summary) {
  if (Array.isArray(metadata) && metadata.length) {
    return metadata.filter(Boolean);
  }
  if (summary) return [summary];
  return [];
}

export default function ReferencedManifestCard({
  manifest = null,
  href,
  title,
  summary,
  metadata,
  thumbnail,
  type,
  className = "",
  ...rest
}) {
  const record = manifest || {};
  const resolvedHref = href ?? record.href ?? "";
  const resolvedTitle = title ?? record.title ?? record.href ?? "";
  const resolvedSummary = summary ?? record.summary ?? "";
  const resolvedMetadata = normalizeMetadata(
    metadata ?? record.metadata,
    resolvedSummary
  );
  const resolvedThumbnail = thumbnail ?? record.thumbnail ?? null;
  const resolvedType = type ?? record.type ?? "work";
  const classes = [
    "canopy-referenced-manifest-card",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TeaserCard
      href={resolvedHref || undefined}
      title={resolvedTitle || resolvedHref || ""}
      summary={resolvedSummary}
      metadata={resolvedMetadata}
      thumbnail={resolvedThumbnail}
      type={resolvedType}
      className={classes}
      {...rest}
    />
  );
}
