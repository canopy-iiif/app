import React from "react";

export default function MdxFacetSliders(props) {
  let json = "{}";
  try {
    json = JSON.stringify(props || {});
  } catch (_) {
    json = "{}";
  }
  return (
    <div data-canopy-facet-sliders="1" className="not-prose">
      <script
        type="application/json"
        dangerouslySetInnerHTML={{ __html: json }}
      />
    </div>
  );
}
