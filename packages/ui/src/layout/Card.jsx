import React from "react";

/**
 * Card
 *
 * Renders an anchor wrapping a figure with an image and caption.
 * Minimal styling; consumers can override via className/style.
 *
 * Props:
 * - href: string (required) — link target
 * - src: string (optional) — image source
 * - alt: string (optional) — image alt text (falls back to title)
 * - title: string (optional) — primary caption text
 * - subtitle: string (optional) — secondary caption text
 * - className: string (optional)
 * - style: object (optional)
 * - children: ReactNode (optional) — appended inside figcaption
 */
export default function Card({
  href,
  src,
  alt,
  title,
  subtitle,
  // Optional intrinsic dimensions or aspect ratio to compute a responsive height
  imgWidth,
  imgHeight,
  aspectRatio,
  className,
  style,
  children,
  ...rest
}) {
  // Compute aspect ratio and padding-bottom percentage for responsive height
  const w = Number(imgWidth);
  const h = Number(imgHeight);
  const ratio = Number.isFinite(Number(aspectRatio)) && Number(aspectRatio) > 0
    ? Number(aspectRatio)
    : (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0 ? w / h : undefined);
  const paddingPercent = ratio ? (100 / ratio) : undefined;
  const caption = (
    <figcaption style={{ marginTop: 8 }}>
      {title ? <strong style={{ display: "block" }}>{title}</strong> : null}
      {subtitle ? (
        <span style={{ display: "block", color: "#6b7280" }}>{subtitle}</span>
      ) : null}
      {children}
    </figcaption>
  );

  return (
    <a
      href={href}
      className={className}
      style={style}
      data-aspect-ratio={ratio}
      data-padding-bottom={typeof paddingPercent === 'number' ? paddingPercent : undefined}
      {...rest}
    >
      <figure style={{ margin: 0 }}>
        {src ? (
          ratio ? (
            <div
              className="canopy-card-media"
              style={{
                position: "relative",
                width: "100%",
                paddingBottom: `${paddingPercent}%`,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <img
                src={src}
                alt={alt || title || ""}
                loading="lazy"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          ) : (
            <img
              src={src}
              alt={alt || title || ""}
              loading="lazy"
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                borderRadius: 4,
              }}
            />
          )
        ) : null}
        {caption}
      </figure>
    </a>
  );
}
