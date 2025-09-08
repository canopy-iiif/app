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
  className,
  style,
  children,
  ...rest
}) {
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
    <a href={href} className={className} style={style} {...rest}>
      <figure style={{ margin: 0 }}>
        {src ? (
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
        ) : null}
        {caption}
      </figure>
    </a>
  );
}
