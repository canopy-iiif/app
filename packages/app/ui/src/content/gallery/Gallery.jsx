import React from "react";
import {
  useReferencedManifestMap,
  resolveReferencedManifests,
} from "../../utils/manifestReferences.js";

const INLINE_SCRIPT = `(() => {
  if (typeof window === 'undefined') return;
  if (window.__canopyGalleryBound) return;
  window.__canopyGalleryBound = true;
  const focusableSelector =
    'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const raf =
    (window.requestAnimationFrame && window.requestAnimationFrame.bind(window)) ||
    function (cb) {
      return window.setTimeout(cb, 0);
    };
  let activeModal = null;

  function isVisible(node) {
    return !!(node && (node.offsetWidth || node.offsetHeight || node.getClientRects().length));
  }

  function getFocusable(modal) {
    if (!modal) return [];
    return Array.prototype.slice
      .call(modal.querySelectorAll(focusableSelector))
      .filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true' && isVisible(node));
  }

  function escapeSelector(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(value);
    }
    return value.replace(/"/g, '\\"');
  }

  function findTrigger(modal) {
    if (!modal || !modal.id) return null;
    try {
      return document.querySelector('[data-canopy-gallery-trigger="' + escapeSelector(modal.id) + '"]');
    } catch (_) {
      return null;
    }
  }

  function focusInitial(modal) {
    if (!modal) return;
    const focusables = getFocusable(modal);
    const target = focusables[0] || modal;
    raf(() => {
      try {
        target.focus({preventScroll: true});
      } catch (_) {
        try {
          target.focus();
        } catch (err) {}
      }
    });
  }

  function lockScroll() {
    document.body && document.body.setAttribute('data-canopy-gallery-locked', '1');
  }

  function unlockScroll() {
    document.body && document.body.removeAttribute('data-canopy-gallery-locked');
  }

  function handleKeydown(event) {
    if (!activeModal) return;
    if (event.key === 'Escape' || event.key === 'Esc') {
      event.preventDefault();
      const closeId = activeModal.getAttribute('data-canopy-gallery-close');
      if (closeId) {
        const targetHash = '#' + closeId;
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        } else {
          window.location.hash = targetHash;
        }
      } else {
        window.location.hash = '';
      }
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = getFocusable(activeModal);
    if (!focusables.length) {
      event.preventDefault();
      activeModal.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    if (event.shiftKey) {
      if (current === first || !activeModal.contains(current)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (current === last || !activeModal.contains(current)) {
      event.preventDefault();
      first.focus();
    }
  }

  function setActiveModal(modal) {
    if (modal) {
      if (!activeModal) {
        lockScroll();
        document.addEventListener('keydown', handleKeydown, true);
      } else if (activeModal !== modal) {
        activeModal.removeAttribute('data-canopy-gallery-active');
      }
      activeModal = modal;
      modal.setAttribute('data-canopy-gallery-active', '1');
      focusInitial(modal);
      return;
    }
    if (!activeModal) return;
    const previous = activeModal;
    activeModal = null;
    previous.removeAttribute('data-canopy-gallery-active');
    unlockScroll();
    document.removeEventListener('keydown', handleKeydown, true);
    const closeTarget = previous.getAttribute('data-canopy-gallery-close');
    if (closeTarget) {
      const closeHash = '#' + closeTarget;
      if (window.location.hash === closeHash) {
        try {
          if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState('', document.title, window.location.pathname + window.location.search);
          } else {
            window.location.hash = '';
          }
        } catch (_) {}
      }
    }
    const trigger = findTrigger(previous);
    if (trigger && typeof trigger.focus === 'function') {
      raf(() => {
        try {
          trigger.focus({preventScroll: true});
        } catch (_) {
          try {
            trigger.focus();
          } catch (err) {}
        }
      });
    }
  }

  function modalFromHash() {
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return null;
    const candidate = document.getElementById(id);
    if (!candidate) return null;
    return candidate.hasAttribute('data-canopy-gallery-modal') ? candidate : null;
  }

  function syncFromHash() {
    const modal = modalFromHash();
    if (modal) {
      setActiveModal(modal);
    } else {
      setActiveModal(null);
    }
  }

  window.addEventListener('hashchange', syncFromHash);
  window.addEventListener('pageshow', syncFromHash);
  syncFromHash();
})()`;

let galleryInstanceCounter = 0;

function nextGalleryInstanceId() {
  galleryInstanceCounter += 1;
  return `canopy-gallery-${galleryInstanceCounter}`;
}

function slugify(value, fallback) {
  if (!value) return fallback;
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
  if (!normalized) return fallback;
  return normalized;
}

function ensureArray(value) {
  if (!value && value !== 0) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeOrder(value) {
  const normalized = String(value || "default").toLowerCase();
  return normalized === "random" ? "random" : "default";
}

function shuffleItems(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function renderMetaList(meta, className) {
  const entries = ensureArray(meta).filter((entry) => entry || entry === 0);
  if (!entries.length) return null;
  return (
    <ul className={className} role="list">
      {entries.map((entry, index) => (
        <li key={`meta-${index}`}>{entry}</li>
      ))}
    </ul>
  );
}

function renderPreview(props = {}) {
  const source =
    (typeof props.media === "string" && props.media) ||
    props.thumbnail ||
    props.src ||
    (props.image && props.image.src) ||
    props.image;
  if (source) {
    const alt =
      props.thumbnailAlt || props.imageAlt || props.alt || props.title || "";
    const width = props.thumbnailWidth || props.imageWidth || props.width;
    const height = props.thumbnailHeight || props.imageHeight || props.height;
    return (
      <img
        src={source}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
      />
    );
  }
  return <div className="canopy-gallery__placeholder" aria-hidden="true" />;
}

function normalizeItem(child, index, galleryId, manifestMap) {
  if (!React.isValidElement(child)) return null;
  if (child.type !== GalleryItem && child.type?.displayName !== "GalleryItem")
    return null;
  const props = child.props || {};
  const manifestValues = Array.isArray(props.referencedManifests)
    ? props.referencedManifests
    : props.manifest
      ? [props.manifest]
      : Array.isArray(props.manifests)
        ? props.manifests
        : [];
  const manifests = resolveReferencedManifests(manifestValues, manifestMap);
  const normalizedProps = {...props};
  if (!normalizedProps.title) {
    const manifestWithTitle = manifests.find(
      (manifest) => manifest && manifest.title,
    );
    if (manifestWithTitle && manifestWithTitle.title) {
      normalizedProps.title = manifestWithTitle.title;
    }
  }
  if (!normalizedProps.summary || !normalizedProps.description) {
    const manifestWithSummary = manifests.find(
      (manifest) => manifest && manifest.summary,
    );
    if (manifestWithSummary && manifestWithSummary.summary) {
      if (!normalizedProps.summary) {
        normalizedProps.summary = manifestWithSummary.summary;
      }
      if (!normalizedProps.description) {
        normalizedProps.description = manifestWithSummary.summary;
      }
    }
  }
  if (
    !normalizedProps.thumbnail &&
    !normalizedProps.media &&
    !normalizedProps.image
  ) {
    const manifestWithThumb = manifests.find(
      (manifest) => manifest && manifest.thumbnail,
    );
    if (manifestWithThumb && manifestWithThumb.thumbnail) {
      normalizedProps.thumbnail = manifestWithThumb.thumbnail;
      if (
        manifestWithThumb.thumbnailWidth != null &&
        normalizedProps.thumbnailWidth == null &&
        normalizedProps.imageWidth == null &&
        normalizedProps.width == null
      ) {
        normalizedProps.thumbnailWidth = manifestWithThumb.thumbnailWidth;
      }
      if (
        manifestWithThumb.thumbnailHeight != null &&
        normalizedProps.thumbnailHeight == null &&
        normalizedProps.imageHeight == null &&
        normalizedProps.height == null
      ) {
        normalizedProps.thumbnailHeight = manifestWithThumb.thumbnailHeight;
      }
    }
  }
  const rawSlug =
    normalizedProps.slug ||
    normalizedProps.id ||
    normalizedProps.title ||
    `item-${index + 1}`;
  const slug = slugify(rawSlug, `item-${index + 1}`);
  const modalId = `${galleryId}-modal-${slug}-${index + 1}`;
  const triggerLabel =
    normalizedProps.triggerLabel ||
    normalizedProps.buttonLabel ||
    normalizedProps.linkLabel ||
    `Open popup for ${normalizedProps.title || `item ${index + 1}`}`;
  const modalTitleId = `${modalId}-title`;
  const needsDescriptionId =
    normalizedProps.popupDescription ||
    normalizedProps.modalDescription ||
    normalizedProps.description ||
    normalizedProps.summary;
  const modalDescriptionId = needsDescriptionId
    ? `${modalId}-description`
    : null;
  const manifestLinks = manifests
    .map((manifest) => {
      if (!manifest) return null;
      const href = manifest.href || manifest.id || manifest.slug;
      if (!href) return null;
      return {
        id: manifest.id || manifest.slug || href,
        href,
        title: manifest.title || manifest.label || href,
      };
    })
    .filter(Boolean);

  return {
    index,
    key: child.key != null ? child.key : `${galleryId}-item-${index}`,
    props: normalizedProps,
    modalId,
    slug,
    modalTitleId,
    modalDescriptionId,
    triggerLabel,
    manifests: manifestLinks,
  };
}

function buildCaptionContent(itemProps) {
  if (itemProps.caption) return itemProps.caption;
  const kicker = itemProps.kicker || itemProps.label || itemProps.eyebrow;
  const summary = itemProps.summary || itemProps.description;
  return (
    <>
      {kicker ? <span className="canopy-gallery__kicker">{kicker}</span> : null}
      {itemProps.title ? (
        <span className="canopy-gallery__title-text">{itemProps.title}</span>
      ) : null}
      {summary ? (
        <span className="canopy-gallery__summary">{summary}</span>
      ) : null}
      {renderMetaList(
        itemProps.meta,
        "canopy-gallery__meta canopy-gallery__meta--caption",
      )}
    </>
  );
}

function GalleryModal({item, total, closeTargetId, prevTarget, nextTarget}) {
  const {
    props,
    modalId,
    modalTitleId,
    modalDescriptionId,
    triggerLabel,
    index,
    manifests,
  } = item;
  const kicker = props.kicker || props.label || props.eyebrow;
  const summary =
    props.popupDescription ||
    props.modalDescription ||
    props.description ||
    props.summary ||
    null;
  const modalTitle =
    props.popupTitle || props.modalTitle || props.title || `Item ${index + 1}`;
  const preview = renderPreview(props);
  return (
    <div
      id={modalId}
      className="canopy-gallery__modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      aria-describedby={modalDescriptionId || undefined}
      tabIndex={-1}
      data-canopy-gallery-modal="true"
      data-canopy-gallery-close={closeTargetId}
    >
      <div className="canopy-gallery__modal-scrim">
        <div className="canopy-gallery__modal-panel">
          <header className="canopy-gallery__modal-header">
            {preview ? (
              <div className="canopy-gallery__modal-thumb" aria-hidden="true">
                {preview}
              </div>
            ) : null}
            <div className="canopy-gallery__modal-text">
              {kicker ? (
                <p className="canopy-gallery__modal-kicker">{kicker}</p>
              ) : null}
              <h3 id={modalTitleId} className="canopy-gallery__modal-title">
                {modalTitle}
              </h3>
              {summary ? (
                <p
                  id={modalDescriptionId || undefined}
                  className="canopy-gallery__modal-summary"
                >
                  {summary}
                </p>
              ) : null}
              {renderMetaList(
                props.meta,
                "canopy-gallery__meta canopy-gallery__meta--modal",
              )}
            </div>
          </header>
          <div className="canopy-gallery__modal-body">
            {props.children}
            {manifests && manifests.length ? (
              <section className="canopy-gallery__referenced">
                <h4>Referenced works</h4>
                <ul role="list">
                  {manifests.map((manifest) => (
                    <li key={manifest.id || manifest.href}>
                      <a href={manifest.href}>
                        {manifest.title || manifest.href}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
          <footer className="canopy-gallery__modal-footer">
            <a
              className="canopy-gallery__modal-close"
              href={`#${closeTargetId}`}
              aria-label={`Close popup for ${modalTitle}`}
            >
              Close
            </a>
            {total > 1 ? (
              <nav
                className="canopy-gallery__modal-nav"
                aria-label="Gallery popup navigation"
              >
                <a
                  className="canopy-gallery__modal-nav-link canopy-gallery__modal-nav-link--prev"
                  href={`#${prevTarget}`}
                  aria-label={`Show previous popup before ${modalTitle}`}
                >
                  Prev
                </a>
                <a
                  className="canopy-gallery__modal-nav-link canopy-gallery__modal-nav-link--next"
                  href={`#${nextTarget}`}
                  aria-label={`Show next popup after ${modalTitle}`}
                >
                  Next
                </a>
              </nav>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}

function GalleryFigure({item}) {
  const {props, modalId, triggerLabel} = item;
  return (
    <figure
      className="canopy-gallery__item"
      data-gallery-item-index={item.index}
    >
      <div className="canopy-gallery__media">{renderPreview(props)}</div>
      <figcaption className="canopy-gallery__caption">
        {buildCaptionContent(props)}
      </figcaption>
      <a
        className="canopy-gallery__trigger"
        href={`#${modalId}`}
        aria-haspopup="dialog"
        aria-controls={modalId}
        aria-label={triggerLabel}
        data-canopy-gallery-trigger={modalId}
      >
        <span className="canopy-gallery__trigger-label">{triggerLabel}</span>
      </a>
    </figure>
  );
}

export function GalleryContent({children, flex = false}) {
  const contentClassName = [
    "canopy-gallery-item__content",
    flex ? "canopy-gallery-item__content_flex" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={contentClassName}>{children}</div>;
}

export function GalleryItem() {
  return null;
}

GalleryItem.displayName = "GalleryItem";

function normalizePopupSize(value) {
  const normalized = String(value || "full").toLowerCase();
  return normalized === "medium" ? "medium" : "full";
}

export default function Gallery({
  children,
  id,
  title,
  description,
  popupSize = "full",
  order = "default",
  className = "",
  style = {},
}) {
  const manifestMap = useReferencedManifestMap();
  const galleryId = id ? String(id) : nextGalleryInstanceId();
  const HeadingTag = "h3";
  const closeTargetId = `${galleryId}-close`;
  const childArray = React.Children.toArray(children);
  const items = childArray
    .map((child, index) => normalizeItem(child, index, galleryId, manifestMap))
    .filter(Boolean);

  if (!items.length) return null;

  const popupMode = normalizePopupSize(popupSize);
  const orderMode = normalizeOrder(order);
  const orderedItems = orderMode === "random" ? shuffleItems(items) : items;
  const rootClassName = [
    "canopy-gallery",
    popupMode === "medium"
      ? "canopy-gallery--popup-medium"
      : "canopy-gallery--popup-full",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClassName} style={style} data-canopy-gallery="true">
      <div
        id={closeTargetId}
        className="canopy-gallery__close-anchor"
        aria-hidden="true"
        tabIndex={-1}
      />
      {(title || description) && (
        <div className="canopy-gallery__header">
          {title ? (
            <HeadingTag className="canopy-gallery__heading">{title}</HeadingTag>
          ) : null}
          {description ? (
            <p className="canopy-gallery__description">{description}</p>
          ) : null}
        </div>
      )}
      <div className="canopy-gallery__grid">
        {orderedItems.map((item) => (
          <GalleryFigure key={item.key} item={item} />
        ))}
      </div>
      <div className="canopy-gallery__modals">
        {orderedItems.map((item, index) => {
          const total = orderedItems.length;
          const prevIndex = (index - 1 + total) % total;
          const nextIndex = (index + 1) % total;
          return (
            <GalleryModal
              key={`${item.modalId}-modal`}
              item={item}
              total={total}
              closeTargetId={closeTargetId}
              prevTarget={orderedItems[prevIndex].modalId}
              nextTarget={orderedItems[nextIndex].modalId}
            />
          );
        })}
      </div>
      <script
        data-canopy-gallery-script="true"
        dangerouslySetInnerHTML={{__html: INLINE_SCRIPT}}
      />
    </section>
  );
}

Gallery.Item = GalleryItem;
Gallery.Content = GalleryContent;
