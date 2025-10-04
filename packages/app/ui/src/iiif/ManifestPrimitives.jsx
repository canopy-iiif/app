import React from "react";
import {
  Label as CloverLabel,
  Metadata as CloverMetadata,
  RequiredStatement as CloverRequiredStatement,
  Summary as CloverSummary,
} from "@samvera/clover-iiif/primitives";

function hasInternationalValue(value) {
  if (!value || typeof value !== "object") return false;
  return Object.keys(value).some((key) => {
    const entries = value[key];
    return (
      Array.isArray(entries) &&
      entries.some((entry) => String(entry || "").trim().length > 0)
    );
  });
}

function ensureMetadata(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const { label, value } = item;
    return hasInternationalValue(label) && hasInternationalValue(value);
  });
}

export function Label({ manifest, label, ...rest }) {
  const intl = label || (manifest && manifest.label);
  if (!hasInternationalValue(intl)) return null;
  return <CloverLabel label={intl} {...rest} />;
}

export function Summary({ manifest, summary, ...rest }) {
  const intl = summary || (manifest && manifest.summary);
  if (!hasInternationalValue(intl)) return null;
  return <CloverSummary summary={intl} {...rest} />;
}

export function Metadata({ manifest, metadata, ...rest }) {
  const items = ensureMetadata(metadata || (manifest && manifest.metadata));
  if (!items.length) return null;
  return <CloverMetadata metadata={items} {...rest} />;
}

export function RequiredStatement({ manifest, requiredStatement, ...rest }) {
  const stmt = requiredStatement || (manifest && manifest.requiredStatement);
  if (
    !stmt ||
    !hasInternationalValue(stmt.label) ||
    !hasInternationalValue(stmt.value)
  ) {
    return null;
  }
  return <CloverRequiredStatement requiredStatement={stmt} {...rest} />;
}

export const Primitives = {
  Label,
  Summary,
  Metadata,
  RequiredStatement,
};

export default Primitives;
