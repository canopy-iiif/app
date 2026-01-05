import React from "react";
import {
  createLocale,
  normalizeRange,
  clampProgress,
  formatDateLabel,
} from "./date-utils.js";
import TeaserCard from "../../layout/TeaserCard.jsx";
import ReferencedManifestCard from "../../layout/ReferencedManifestCard.jsx";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TRACK_HEIGHT = 640;
const MIN_HEIGHT_PER_POINT = 220;

function getThresholdMs(threshold, granularity) {
  const value = Number(threshold);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (granularity === "day") return value * DAY_MS;
  if (granularity === "month") return value * 30 * DAY_MS;
  return value * 365 * DAY_MS;
}

function buildGroupedEntries(points, thresholdMs, options) {
  if (!Array.isArray(points) || !points.length) return [];
  if (!thresholdMs) return points.map((point) => ({type: "point", point}));

  const entries = [];
  let currentGroup = null;
  let groupCounter = 0;

  function flush() {
    if (!currentGroup) return;
    if (currentGroup.points.length > 1) {
      const firstPoint = currentGroup.points[0];
      entries.push({
        type: "group",
        id: `canopy-timeline-group-${groupCounter}-${currentGroup.start}`,
        points: currentGroup.points,
        progress: firstPoint.progress,
        side: firstPoint.side,
        label: formatGroupLabel(currentGroup.start, currentGroup.end, options),
        count: currentGroup.points.length,
      });
      groupCounter += 1;
    } else {
      entries.push({type: "point", point: currentGroup.points[0]});
    }
    currentGroup = null;
  }

  points.forEach((point) => {
    const timestamp = point && point.meta ? point.meta.timestamp : null;
    if (!Number.isFinite(timestamp)) {
      flush();
      if (point) entries.push({type: "point", point});
      return;
    }
    if (!currentGroup) {
      currentGroup = {
        points: [point],
        start: timestamp,
        end: timestamp,
        last: timestamp,
      };
      return;
    }
    const diff = Math.abs(timestamp - currentGroup.last);
    if (diff <= thresholdMs) {
      currentGroup.points.push(point);
      currentGroup.last = timestamp;
      if (timestamp < currentGroup.start) currentGroup.start = timestamp;
      if (timestamp > currentGroup.end) currentGroup.end = timestamp;
    } else {
      flush();
      currentGroup = {
        points: [point],
        start: timestamp,
        end: timestamp,
        last: timestamp,
      };
    }
  });

  flush();
  return entries;
}

function formatGroupLabel(startTs, endTs, options) {
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) return "";
  const startLabel = formatDateLabel(new Date(startTs), options);
  const endLabel = formatDateLabel(new Date(endTs), options);
  if (!startLabel || !endLabel) return "";
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function deriveRangeOverrides(points, range) {
  const timestamps = points
    .map((point) => (point && point.meta ? point.meta.timestamp : null))
    .filter((timestamp) => Number.isFinite(timestamp));
  if (!timestamps.length) return range || {};
  const earliest = Math.min(...timestamps);
  const latest = Math.max(...timestamps);
  return {
    ...range,
    start: range && range.start ? range.start : new Date(earliest),
    end: range && range.end ? range.end : new Date(latest),
  };
}

function getActivePointId(points) {
  const highlighted = points.find((point) => point && point.highlight);
  if (highlighted) return highlighted.id;
  return points.length ? points[0].id : null;
}

function formatRangeLabel(rangeInfo) {
  if (!rangeInfo) return "";
  const startLabel = formatDateLabel(rangeInfo.startDate, {
    granularity: rangeInfo.granularity,
    locale: rangeInfo.locale,
  });
  const endLabel = formatDateLabel(rangeInfo.endDate, {
    granularity: rangeInfo.granularity,
    locale: rangeInfo.locale,
  });
  if (!startLabel || !endLabel) return "";
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

function sanitizePoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((point, index) => {
      if (!point) return null;
      const meta = point.meta || {};
      const timestamp = Number(meta.timestamp);
      const manifests = Array.isArray(point.manifests)
        ? point.manifests
            .map((manifest) => (manifest ? {...manifest} : null))
            .filter(Boolean)
        : [];
      const resources = Array.isArray(point.resources)
        ? point.resources.filter(Boolean)
        : [];
      return {
        ...point,
        id: point.id || `timeline-point-${index}`,
        title: point.title || point.label || `Point ${index + 1}`,
        summary: point.summary || point.description || "",
        detailsHtml: point.detailsHtml || "",
        highlight: !!point.highlight,
        side:
          point.side === "left" || point.side === "right" ? point.side : null,
        meta: {
          label: meta.label || "",
          timestamp: Number.isFinite(timestamp) ? timestamp : null,
        },
        manifests,
        resources,
      };
    })
    .filter(Boolean);
}

function resolveTrackHeight(height, pointCount) {
  const minimumPx = Math.max(
    DEFAULT_TRACK_HEIGHT,
    pointCount * MIN_HEIGHT_PER_POINT
  );
  const fallback = `${minimumPx}px`;
  if (height == null) return fallback;
  if (typeof height === "number") {
    const numeric = Number(height);
    if (Number.isFinite(numeric)) {
      return `${Math.max(numeric, pointCount * MIN_HEIGHT_PER_POINT)}px`;
    }
    return fallback;
  }
  if (typeof height === "string") {
    const trimmed = height.trim();
    if (!trimmed) return fallback;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return `${Math.max(numeric, pointCount * MIN_HEIGHT_PER_POINT)}px`;
    }
    return trimmed;
  }
  return fallback;
}

function TimelineConnector({side, isActive, highlight}) {
  const connectorClasses = [
    "canopy-timeline__connector",
    side === "left"
      ? "canopy-timeline__connector--left"
      : "canopy-timeline__connector--right",
  ]
    .filter(Boolean)
    .join(" ");
  const dotClasses = [
    "canopy-timeline__connector-dot",
    highlight || isActive ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={connectorClasses} aria-hidden="true">
      {side === "left" ? (
        <>
          <span className="canopy-timeline__connector-line" />
          <span className={dotClasses} />
        </>
      ) : (
        <>
          <span className={dotClasses} />
          <span className="canopy-timeline__connector-line" />
        </>
      )}
    </span>
  );
}

function renderResourceSection(point) {
  if (!point) return null;
  const manifestCards = Array.isArray(point.manifests)
    ? point.manifests.filter(Boolean)
    : [];
  const legacyResources = Array.isArray(point.resources)
    ? point.resources.filter(Boolean)
    : [];
  if (!manifestCards.length && !legacyResources.length) return null;
  return (
    <div className="canopy-timeline__resources">
      <div className="canopy-timeline__resources-list">
        {manifestCards.map((manifest) => (
          <div key={manifest.id || manifest.href}>
            <ReferencedManifestCard manifest={manifest} />
          </div>
        ))}
        {legacyResources.map((resource, idx) => (
          <div key={resource.id || resource.href || `legacy-${idx}`}>
            <TeaserCard
              href={resource.href}
              title={resource.label || resource.title || resource.href}
              summary={resource.summary}
              thumbnail={resource.thumbnail}
              type={resource.type || "resource"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Timeline({
  className = "",
  title,
  description,
  range: rangeProp,
  locale: localeProp = "en-US",
  height = DEFAULT_TRACK_HEIGHT,
  threshold: thresholdProp = null,
  steps = null,
  points: pointsProp,
  __canopyTimeline: payload = null,
  ...rest
}) {
  const payloadPoints =
    payload && Array.isArray(payload.points) ? payload.points : null;
  const rawPoints = React.useMemo(() => {
    if (Array.isArray(pointsProp) && pointsProp.length) return pointsProp;
    if (payloadPoints && payloadPoints.length) return payloadPoints;
    return [];
  }, [pointsProp, payloadPoints]);

  const sanitizedPoints = React.useMemo(
    () => sanitizePoints(rawPoints),
    [rawPoints]
  );

  const localeValue = payload && payload.locale ? payload.locale : localeProp;
  const baseLocale = React.useMemo(
    () => createLocale(localeValue),
    [localeValue]
  );

  const rangeInput = payload && payload.range ? payload.range : rangeProp || {};
  const rangeOverrides = React.useMemo(
    () => deriveRangeOverrides(sanitizedPoints, rangeInput),
    [sanitizedPoints, rangeInput]
  );
  const effectiveRange = React.useMemo(
    () =>
      normalizeRange({
        ...rangeOverrides,
        locale: baseLocale,
      }),
    [rangeOverrides, baseLocale]
  );

  const spanStart = effectiveRange.startDate.getTime();
  const span = effectiveRange.span;

  const pointsWithPosition = React.useMemo(() => {
    if (!sanitizedPoints.length) return [];
    return sanitizedPoints.map((point, index) => {
      const timestamp = point.meta.timestamp;
      const fallbackProgress =
        sanitizedPoints.length > 1 ? index / (sanitizedPoints.length - 1) : 0;
      const progress = Number.isFinite(timestamp)
        ? clampProgress((timestamp - spanStart) / span)
        : fallbackProgress;
      const side = point.side || (index % 2 === 0 ? "left" : "right");
      return {
        ...point,
        progress,
        side,
      };
    });
  }, [sanitizedPoints, spanStart, span]);

  const [activeId, setActiveId] = React.useState(() =>
    getActivePointId(pointsWithPosition)
  );

  React.useEffect(() => {
    setActiveId(getActivePointId(pointsWithPosition));
  }, [pointsWithPosition]);

  const thresholdValue =
    typeof thresholdProp === "number"
      ? thresholdProp
      : payload && payload.threshold != null
        ? payload.threshold
        : null;
  const stepsValue =
    typeof steps === "number"
      ? Number(steps)
      : payload && typeof payload.steps === "number"
        ? Number(payload.steps)
        : null;

  const thresholdMs = React.useMemo(
    () => getThresholdMs(thresholdValue, effectiveRange.granularity),
    [thresholdValue, effectiveRange.granularity]
  );

  const groupedEntries = React.useMemo(
    () =>
      buildGroupedEntries(pointsWithPosition, thresholdMs, {
        granularity: effectiveRange.granularity,
        locale: baseLocale,
      }),
    [pointsWithPosition, thresholdMs, effectiveRange.granularity, baseLocale]
  );

  const [expandedGroupIds, setExpandedGroupIds] = React.useState(
    () => new Set()
  );

  React.useEffect(() => {
    setExpandedGroupIds((prev) => {
      if (!prev || prev.size === 0) return prev;
      const validIds = new Set(
        groupedEntries
          .filter((entry) => entry.type === "group")
          .map((entry) => entry.id)
      );
      const next = new Set();
      let changed = false;
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [groupedEntries]);

  const toggleGroup = React.useCallback((groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev || []);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const trackHeight = resolveTrackHeight(height, pointsWithPosition.length);
  const containerClasses = ["canopy-timeline", className]
    .filter(Boolean)
    .join(" ");
  const rangeLabel = formatRangeLabel(effectiveRange);

  function renderPointEntry(point) {
    if (!point) return null;
    const wrapperClasses = [
      "canopy-timeline__point-wrapper",
      point.side === "left"
        ? "canopy-timeline__point-wrapper--left"
        : "canopy-timeline__point-wrapper--right",
    ]
      .filter(Boolean)
      .join(" ");
    const wrapperStyle = {top: `${point.progress * 100}%`};
    const cardClasses = [
      "canopy-timeline__point",
      point.id === activeId ? "is-active" : "",
      point.highlight ? "is-highlighted" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const connector = (
      <TimelineConnector
        side={point.side}
        isActive={point.id === activeId}
        highlight={point.highlight}
      />
    );

    const body = (
      <div className="canopy-timeline__point-body">
        <span className="canopy-timeline__point-date">{point.meta.label}</span>
        <span className="canopy-timeline__point-title">{point.title}</span>
        {point.summary ? (
          <span className="canopy-timeline__point-summary">
            {point.summary}
          </span>
        ) : null}
      </div>
    );
    const resourceSection = renderResourceSection(point);

    return (
      <div
        key={point.id}
        className={wrapperClasses}
        style={wrapperStyle}
        role="listitem"
      >
        {point.side === "left" ? (
          <>
            <div className={cardClasses}>
              {body}
              {resourceSection}
            </div>
            {connector}
          </>
        ) : (
          <>
            {connector}
            <div className={cardClasses}>
              {body}
              {resourceSection}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderGroupEntry(entry) {
    const wrapperClasses = [
      "canopy-timeline__point-wrapper",
      entry.side === "left"
        ? "canopy-timeline__point-wrapper--left"
        : "canopy-timeline__point-wrapper--right",
    ]
      .filter(Boolean)
      .join(" ");
    const wrapperStyle = {top: `${entry.progress * 100}%`};
    const isExpanded = expandedGroupIds.has(entry.id);
    const hasActivePoint = entry.points.some((point) => point.id === activeId);
    const connector = (
      <TimelineConnector
        side={entry.side}
        isActive={hasActivePoint}
        highlight={hasActivePoint}
      />
    );
    const groupClasses = [
      "canopy-timeline__group",
      isExpanded ? "is-expanded" : "",
      hasActivePoint ? "is-active" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const countLabel = `${entry.count} event${entry.count > 1 ? "s" : ""}`;

    const header = (
      <div className="canopy-timeline__group-header">
        <div className="canopy-timeline__group-summary">
          <span className="canopy-timeline__point-date">{entry.label}</span>
          <span className="canopy-timeline__group-count">{countLabel}</span>
        </div>
        <button
          type="button"
          className="canopy-timeline__group-toggle"
          aria-expanded={isExpanded ? "true" : "false"}
          onClick={() => toggleGroup(entry.id)}
        >
          {isExpanded ? "Hide details" : "Show details"}
        </button>
      </div>
    );

    const groupPoints = isExpanded ? (
      <div className="canopy-timeline__group-points">
        {entry.points.map((point) => (
          <button
            key={point.id}
            type="button"
            className={[
              "canopy-timeline__group-point",
              point.id === activeId ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setActiveId(point.id)}
          >
            <span className="canopy-timeline__point-date">
              {point.meta.label}
            </span>
            <span className="canopy-timeline__group-point-title">
              {point.title}
            </span>
          </button>
        ))}
      </div>
    ) : null;

    const groupCard = (
      <div className={groupClasses}>
        {header}
        {groupPoints}
      </div>
    );

    return (
      <div
        key={entry.id}
        className={wrapperClasses}
        style={wrapperStyle}
        role="listitem"
      >
        {entry.side === "left" ? (
          <>
            {groupCard}
            {connector}
          </>
        ) : (
          <>
            {connector}
            {groupCard}
          </>
        )}
      </div>
    );
  }

  return (
    <section className={containerClasses} {...rest}>
      {title ? <h2 className="canopy-timeline__title">{title}</h2> : null}
      {description ? (
        <p className="canopy-timeline__description">{description}</p>
      ) : null}
      {rangeLabel ? (
        <p className="canopy-timeline__range" aria-live="polite">
          {rangeLabel}
        </p>
      ) : null}
      <div className="canopy-timeline__body">
        <div
          className="canopy-timeline__list"
          role="list"
          style={{minHeight: trackHeight}}
        >
          <div className="canopy-timeline__spine" aria-hidden="true" />
          {renderSteps(stepsValue, effectiveRange)}
          {groupedEntries.map((entry) => {
            if (entry.type === "group") return renderGroupEntry(entry);
            return renderPointEntry(entry.point);
          })}
        </div>
      </div>
    </section>
  );
}

function renderSteps(stepSize, range) {
  if (!Number.isFinite(stepSize) || stepSize <= 0 || !range) return null;
  const startYear = range.startDate.getUTCFullYear();
  const endYear = range.endDate.getUTCFullYear();
  const markers = [];
  if (startYear < endYear) {
    markers.push(
      <span
        key="timeline-step-start"
        className="canopy-timeline__step canopy-timeline__step--start"
        style={{top: "0%"}}
        aria-hidden="true"
      >
        <span className="canopy-timeline__step-line" />
        <span className="canopy-timeline__step-label">{startYear}</span>
      </span>
    );
    markers.push(
      <span
        key="timeline-step-end"
        className="canopy-timeline__step canopy-timeline__step--end"
        style={{top: "100%"}}
        aria-hidden="true"
      >
        <span className="canopy-timeline__step-line" />
        <span className="canopy-timeline__step-label">{endYear}</span>
      </span>
    );
  }
  const baseYear = Math.ceil(startYear / stepSize) * stepSize;
  for (let year = baseYear; year <= endYear; year += stepSize) {
    const timestamp = Date.UTC(year, 0, 1);
    const progress = (timestamp - range.startDate.getTime()) / range.span;
    if (progress <= 0 || progress >= 1) continue;
    markers.push(
      <span
        key={`timeline-step-${year}`}
        className="canopy-timeline__step"
        style={{top: `calc(${progress * 100}% - 0.5px)`}}
        aria-hidden="true"
      >
        <span className="canopy-timeline__step-line" />
        <span className="canopy-timeline__step-label">{year}</span>
      </span>
    );
  }
  return markers.length ? markers : null;
}
