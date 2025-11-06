import React from "react";
import helpers from "../../../lib/components/featured.js";
import {computeHeroHeightStyle} from "./hero-utils.js";
import Button from "../layout/Button.jsx";
import ButtonWrapper from "../layout/ButtonWrapper.jsx";

const basePath = (() => {
  try {
    const raw =
      typeof process !== "undefined" && process && process.env
        ? String(process.env.CANOPY_BASE_PATH || "")
        : "";
    return raw.replace(/\/$/, "");
  } catch (_) {
    return "";
  }
})();

function applyBasePath(href) {
  try {
    if (!href) return href;
    if (!basePath) return href;
    if (typeof href === "string" && href.startsWith("/")) {
      return `${basePath}${href}`;
    }
  } catch (_) {}
  return href;
}

function resolveFeaturedItem({item, index, random}) {
  if (item) return item;
  const list =
    helpers && helpers.readFeaturedFromCacheSync
      ? helpers.readFeaturedFromCacheSync()
      : [];
  if (!list.length) return null;
  if (typeof index === "number") {
    const idx = Math.max(0, Math.min(list.length - 1, Math.floor(index)));
    return list[idx];
  }
  if (random === true || random === "true") {
    const idx = Math.floor(Math.random() * Math.max(1, list.length));
    return list[idx];
  }
  return list[0];
}

function normalizeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => {
      if (!link) return null;
      const href = applyBasePath(link.href || "");
      const title = link.title ? String(link.title) : "";
      if (!href || !title) return null;
      const type = link.type === "secondary" ? "secondary" : "primary";
      const target = link.target ? String(link.target) : undefined;
      return {href, title, type, target};
    })
    .filter(Boolean);
}

function sanitizeRest(rest) {
  const clone = {...rest};
  try {
    delete clone.random;
    delete clone.index;
    delete clone.item;
    delete clone.links;
    delete clone.overlay;
    delete clone.variant;
    delete clone.background;
  } catch (_) {}
  return clone;
}

function normalizeBackground(value) {
  try {
    const allowed = new Set(["theme", "transparent"]);
    const raw = value == null ? "" : String(value);
    const normalized = raw.trim().toLowerCase();
    return allowed.has(normalized) ? normalized : "theme";
  } catch (_) {
    return "theme";
  }
}

export default function Hero({
  height = 520,
  item,
  index,
  random = true,
  headline,
  description,
  links = [],
  className = "",
  style = {},
  background = "theme",
  ...rest
}) {
  const resolved = resolveFeaturedItem({item, index, random});
  const helpersList =
    helpers && helpers.readFeaturedFromCacheSync
      ? helpers.readFeaturedFromCacheSync()
      : [];

  const slides = [];
  const pushUnique = (entry) => {
    if (!entry) return;
    const key = String(entry.href || entry.id || entry.title || "");
    const hasKey = slides.some(
      (item) =>
        String(item && (item.href || item.id || item.title || "")) === key
    );
    if (!hasKey) {
      slides.push(entry);
    }
  };

  if (resolved) pushUnique(resolved);
  helpersList.forEach(pushUnique);

  if (!slides.length) return null;

  let orderedSlides = slides.slice();
  if (typeof index === "number" && orderedSlides.length > 1) {
    const clamp = Math.max(
      0,
      Math.min(orderedSlides.length - 1, Math.floor(index))
    );
    if (clamp > 0) {
      orderedSlides = orderedSlides
        .slice(clamp)
        .concat(orderedSlides.slice(0, clamp));
    }
  } else if (random === true || random === "true") {
    const rand = Math.floor(Math.random() * orderedSlides.length);
    if (rand > 0) {
      orderedSlides = orderedSlides
        .slice(rand)
        .concat(orderedSlides.slice(0, rand));
    }
  }

  const heroHeight = computeHeroHeightStyle(height);
  const heroStyles = {...(style || {})};
  if (heroHeight && heroHeight.height) {
    heroStyles["--hero-height"] = heroHeight.height;
  }

  const derivedDescription = description ? String(description) : "";
  const normalizedLinks = normalizeLinks(links);

  const primarySlide = orderedSlides[0] || null;
  const overlayTitle = headline || (primarySlide && primarySlide.title) || "";
  const defaultLinkHref = applyBasePath(
    primarySlide && primarySlide.href ? primarySlide.href : "#"
  );
  const overlayLinks = normalizedLinks.length
    ? normalizedLinks
    : [
        {
          href: defaultLinkHref,
          title: "View work",
          type: "primary",
        },
      ];

  const normalizedBackground = normalizeBackground(background);
  const backgroundClassName =
    normalizedBackground === "transparent"
      ? "canopy-interstitial--bg-transparent"
      : "";

  const containerClassName = [
    "canopy-interstitial",
    "canopy-interstitial--hero",
    backgroundClassName,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const renderSlide = (
    slide,
    idx,
    { showVeil = true, captionVariant = "overlay" } = {}
  ) => {
    const safeHref = applyBasePath(slide.href || "#");
    const isStaticCaption = captionVariant === "static";
    const paneClassName = [
      "canopy-interstitial__pane",
      showVeil ? "" : "canopy-interstitial__pane--flat",
      isStaticCaption ? "canopy-interstitial__pane--static" : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (isStaticCaption) {
      return (
        <div className="swiper-slide" key={safeHref || idx}>
          <article className={paneClassName}>
            {slide.thumbnail ? (
              <div className="canopy-interstitial__media-frame">
                <img
                  src={slide.thumbnail}
                  alt=""
                  aria-hidden="true"
                  className="canopy-interstitial__media canopy-interstitial__media--static"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              </div>
            ) : null}
            {slide.title ? (
              <div className="canopy-interstitial__caption canopy-interstitial__caption--static">
                <a href={safeHref} className="canopy-interstitial__caption-link">
                  {slide.title}
                </a>
              </div>
            ) : null}
          </article>
        </div>
      );
    }

    return (
      <div className="swiper-slide" key={safeHref || idx}>
        <article className={paneClassName}>
          {slide.thumbnail ? (
            <img
              src={slide.thumbnail}
              alt=""
              aria-hidden="true"
              className="canopy-interstitial__media"
              loading={idx === 0 ? "eager" : "lazy"}
            />
          ) : null}
          {showVeil ? (
            <div className="canopy-interstitial__veil" aria-hidden="true" />
          ) : null}
          {slide.title ? (
            <div className="canopy-interstitial__caption">
              <a href={safeHref} className="canopy-interstitial__caption-link">
                {slide.title}
              </a>
            </div>
          ) : null}
        </article>
      </div>
    );
  };

  const renderSlider = (options = {}) => (
    <div className="canopy-interstitial__slider swiper">
      <div className="swiper-wrapper">
        {orderedSlides.map((slide, idx) => renderSlide(slide, idx, options))}
      </div>
      <div className="canopy-interstitial__nav">
        <button
          type="button"
          aria-label="Previous slide"
          className="canopy-interstitial__nav-btn canopy-interstitial__nav-btn--prev swiper-button-prev"
        />
        <button
          type="button"
          aria-label="Next slide"
          className="canopy-interstitial__nav-btn canopy-interstitial__nav-btn--next swiper-button-next"
        />
      </div>
      <div className="canopy-interstitial__pagination swiper-pagination" />
    </div>
  );

  const overlayContent = (
    <>
      {overlayTitle ? (
        <h1 className="canopy-interstitial__headline">{overlayTitle}</h1>
      ) : null}
      {derivedDescription ? (
        <p className="canopy-interstitial__description">
          {derivedDescription}
        </p>
      ) : null}
      {overlayLinks.length ? (
        <ButtonWrapper className="canopy-interstitial__actions">
          {overlayLinks.map((link) => (
            <Button
              key={`${link.href}-${link.title}`}
              href={link.href}
              label={link.title}
              variant={link.type}
              target={link.target}
            />
          ))}
        </ButtonWrapper>
      ) : null}
    </>
  );

  const cleanedProps = sanitizeRest(rest);

  return (
    <section
      className={containerClassName}
      data-canopy-hero-slider="1"
      style={heroStyles}
      {...cleanedProps}
    >
      <div className="canopy-interstitial__layout">
        <div className="canopy-interstitial__panel">
          <div className="canopy-interstitial__body">{overlayContent}</div>
        </div>
        <div className="canopy-interstitial__media-group">
          {renderSlider({ showVeil: false, captionVariant: "static" })}
        </div>
      </div>
    </section>
  );
}
