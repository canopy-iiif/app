import React from "react";
import * as radixColors from "@radix-ui/colors";

const COLOR_SCALES = [
  {label: "Accent", prefix: "--color-accent"},
  {label: "Gray", prefix: "--color-gray"},
];

const COLOR_STOPS = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
];

const ACCENT_COLOR_NAMES = [
  "gray",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "ruby",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
];

const GRAY_COLOR_NAMES = ["gray", "mauve", "slate", "sage", "olive", "sand"];

const Section = ({title, description, children}) => (
  <div className="canopy-theme-showcase__section">
    <h3 className="canopy-theme-showcase__section-title">{title}</h3>
    {description ? (
      <p className="canopy-theme-showcase__section-description">
        {description}
      </p>
    ) : null}
    {children}
  </div>
);

const ColorScaleRow = ({label, prefix}) => (
  <div className="canopy-theme-showcase__scale-row">
    <div className="canopy-theme-showcase__scale-label">
      <strong>{label}</strong>
    </div>
    <div className="canopy-theme-showcase__scale-track">
      {COLOR_STOPS.map((stop) => (
        <div
          key={`${label}-${stop}`}
          className="canopy-theme-showcase__scale-stop"
        >
          <span
            className="canopy-theme-showcase__scale-chip"
            style={{backgroundColor: `var(${prefix}-${stop})`}}
          />
          <span className="canopy-theme-showcase__scale-token">{stop}</span>
        </div>
      ))}
    </div>
  </div>
);

export default function ThemeShowcase() {
  const accentColors = ACCENT_COLOR_NAMES;
  const grayColors = GRAY_COLOR_NAMES;

  const getRadixSwatch = (name) => {
    if (!name) return null;
    const scale = radixColors[name];
    if (!scale) return null;
    return scale[`${name}9`] || Object.values(scale)[8];
  };

  const ColorsLabeled = ({colors}) => (
    <div className="canopy-theme-showcase__swatch-grid">
      {colors.map((name) => {
        const colorValue = getRadixSwatch(name);
        return (
          <div key={name} className="canopy-theme-showcase__swatch">
            <div
              className="canopy-theme-showcase__swatch-chip"
              style={{background: colorValue || "var(--color-gray-200)"}}
            />
            <div className="canopy-theme-showcase__swatch-label">{name}</div>
          </div>
        );
      })}
    </div>
  );

  const styles = `
    .canopy-theme-showcase__section {
      margin-bottom: 2.5rem;
    }
    .canopy-theme-showcase__section:last-of-type {
      margin-bottom: 0;
    }
    .canopy-theme-showcase__section-title {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
    }
    .canopy-theme-showcase__section-description {
      margin: 0 0 1.25rem 0;
      color: var(--color-gray-muted);
      line-height: 1.5;
    }
    .canopy-theme-showcase__scale-group {
      display: flex;
      flex-direction: column;
      gap: 1.618rem;
    }
    .canopy-theme-showcase__scale-row {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .canopy-theme-showcase__scale-label {
      min-width: 90px;
      font-size: 0.95rem;
    }
    .canopy-theme-showcase__scale-track {
      display: flex;
      flex: 1;
      overflow: auto;
    }
    .canopy-theme-showcase__scale-stop {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.382rem;
      overflow: hidden;

      &:first-child {
        .canopy-theme-showcase__scale-chip {
          border-top-left-radius: 3px;
          border-bottom-left-radius: 3px;
        }
      }

      &:last-child {
        .canopy-theme-showcase__scale-chip {
          border-top-right-radius: 3px;
          border-bottom-right-radius: 3px;
        }
      }
    }
    .canopy-theme-showcase__scale-chip {
      display: block;
      width: 100%;
      min-height: 2.618rem;
    }
    .canopy-theme-showcase__scale-token {
      font-size: 0.8333rem;
    }
    .canopy-theme-showcase__swatch-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .canopy-theme-showcase__swatch-chip {
      width: 4.236rem;
      height: 2.618rem;
      border-radius: 3px;
    }
    .canopy-theme-showcase__swatch-label {
      font-size: 0.8333rem;
      margin-top: 0.382rem;
      font-weight: 300;
    }
  `;

  return (
    <div className="canopy-theme-showcase">
      <style dangerouslySetInnerHTML={{__html: styles}} />
      <Section
        title="Color scales"
        description="Accent and gray ramps from the active theme."
      >
        <div style={{display: "flex", flexDirection: "column", gap: "1.5rem"}}>
          {COLOR_SCALES.map((scale) => (
            <ColorScaleRow
              key={scale.label}
              label={scale.label}
              prefix={scale.prefix}
            />
          ))}
        </div>
      </Section>
      <Section
        title="Accent palette options"
        description="All accent color families available via Radix Themes."
      >
        <ColorsLabeled colors={accentColors} />
      </Section>
      <Section
        title="Gray palette options"
        description="Neutral ramps you can assign via the theme block."
      >
        <ColorsLabeled colors={grayColors} />
      </Section>
    </div>
  );
}
