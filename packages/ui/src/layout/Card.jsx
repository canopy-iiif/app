import React, { useEffect, useRef, useState } from "react";

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
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  /**
   * Use IntersectionObserver to detect when the card enters the viewport.
   * When in view, setInView(true) to trigger image loading.
   * If IntersectionObserver is not supported, default to inView=true.
   */
  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof IntersectionObserver !== "function") {
      setInView(true);
      return;
    }
    const el = containerRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            try {
              obs.unobserve(el);
            } catch (_) {}
            break;
          }
        }
      },
      { root: null, rootMargin: "100px", threshold: 0.1 }
    );
    try {
      obs.observe(el);
    } catch (_) {}
    return () => {
      try {
        obs.disconnect();
      } catch (_) {}
    };
  }, []);

  /**
   * Calculate aspect ratio and padding percent for responsive image container.
   */
  const w = Number(imgWidth);
  const h = Number(imgHeight);
  const ratio =
    Number.isFinite(Number(aspectRatio)) && Number(aspectRatio) > 0
      ? Number(aspectRatio)
      : Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0
      ? w / h
      : undefined;
  const paddingPercent = ratio ? 100 / ratio : 100;

  /**
   * Caption element (figcaption), rendered if title, subtitle, or children are provided.
   */
  const caption = (
    <figcaption>
      {title && <span>{title}</span>}
      {subtitle && <span>{subtitle}</span>}
      {children}
    </figcaption>
  );

  return (
    <a
      href={href}
      className={["canopy-card", className].filter(Boolean).join(" ")}
      style={style}
      ref={containerRef}
      data-aspect-ratio={ratio}
      data-in-view={inView ? "true" : "false"}
      data-image-loaded={imageLoaded ? "true" : "false"}
      {...rest}
    >
      <figure>
        {src ? (
          ratio ? (
            <div
              className="canopy-card-media"
              style={{ "--canopy-card-padding": `${paddingPercent}%` }}
            >
              {inView ? (
                <img
                  src={src}
                  alt={alt || title || ""}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              ) : null}
            </div>
          ) : (
            <img
              src={src}
              alt={alt || title || ""}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              className="canopy-card-image"
            />
          )
        ) : null}
        {caption}
      </figure>
    </a>
  );
}
