import React from "react";

export default function TeaserCard({
  href = "",
  title = "",
  metadata = [],
  summary = "",
  thumbnail = null,
  type = "work",
  className = "",
  ...rest
}) {
  const Tag = href ? "a" : "div";
  const classes = [
    "canopy-card",
    "canopy-card--teaser",
    "canopy-search-teaser__item",
    "canopy-teaser-card",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const showThumb = type === "work" && thumbnail;
  const metaLine = (
    Array.isArray(metadata) && metadata.length
      ? metadata.filter(Boolean)
      : summary
      ? [summary]
      : []
  )
    .filter(Boolean)
    .slice(0, 2)
    .join(" • ");

  return (
    <Tag
      className={classes}
      href={href || undefined}
      data-canopy-item={href ? "" : undefined}
      {...rest}
    >
      {showThumb ? (
        <div className="canopy-search-teaser__thumb">
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            className="canopy-search-teaser__thumb-img"
          />
        </div>
      ) : null}
      <div className="canopy-search-teaser__text">
        <span className="canopy-search-teaser__title">
          {title || href || 'Untitled'}
        </span>
        {metaLine ? (
          <span className="canopy-search-teaser__meta">{metaLine}</span>
        ) : null}
      </div>
    </Tag>
  );
}
