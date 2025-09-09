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
  useEffect(() => {
    if (!containerRef.current) return;
    // If IntersectionObserver is unavailable, load immediately
    if (typeof IntersectionObserver !== "function") { setInView(true); return; }
    const el = containerRef.current;
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { setInView(true); try { obs.unobserve(el); } catch (_) {} break; }
      }
    }, { root: null, rootMargin: '100px', threshold: 0.1 });
    try { obs.observe(el); } catch (_) {}
    return () => { try { obs.disconnect(); } catch (_) {} };
  }, []);
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
      ref={containerRef}
      data-aspect-ratio={ratio}
      data-padding-bottom={typeof paddingPercent === 'number' ? paddingPercent : undefined}
      data-in-view={inView ? 'true' : 'false'}
      data-image-loaded={imageLoaded ? 'true' : 'false'}
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
                backgroundColor: "#e5e7eb",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              {inView ? (
                <img
                  src={src}
                  alt={alt || title || ""}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    opacity: imageLoaded ? 1 : 0,
                    transition: "opacity 600ms ease",
                  }}
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
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                borderRadius: 4,
                opacity: inView ? (imageLoaded ? 1 : 0) : 0,
                transition: "opacity 600ms ease",
              }}
            />
          )
        ) : null}
        {caption}
      </figure>
    </a>
  );
}
