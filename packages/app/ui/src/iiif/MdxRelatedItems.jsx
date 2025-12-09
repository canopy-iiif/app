import React from "react";

// SSR-safe placeholder for RelatedItems. Hydrated by canopy-related-items.js + canopy-slider.js
export default function MdxRelatedItems(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return (
    <div data-canopy-related-items="1">
      <script
        type="application/json"
        dangerouslySetInnerHTML={{__html: json}}
      />
    </div>
  );
}
