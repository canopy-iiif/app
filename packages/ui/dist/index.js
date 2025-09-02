// src/iiif/Viewer.jsx
import React2 from "react";

// src/Hydrate.jsx
import React from "react";
function Hydrate({ component, ...props }) {
  const payload = encodeURIComponent(JSON.stringify(props || {}));
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      "data-canopy-hydrate": true,
      "data-component": component,
      "data-props": payload
    }
  );
}

// src/iiif/Viewer.jsx
function Viewer(props) {
  return /* @__PURE__ */ React2.createElement(Hydrate, { component: "CloverViewer", ...props });
}

// src/Fallback.jsx
import React3 from "react";
function Fallback({ name, ...props }) {
  const style = {
    padding: "0.75rem 1rem",
    border: "1px dashed #d1d5db",
    color: "#6b7280",
    borderRadius: 6,
    background: "#f9fafb",
    fontSize: 14
  };
  return /* @__PURE__ */ React3.createElement("div", { style, "data-fallback-component": name || "Unknown" }, /* @__PURE__ */ React3.createElement("strong", null, name || "Unknown component"), " not available in UI.");
}

// src/HelloWorld.jsx
import React4 from "react";
var HelloWorld = () => {
  return /* @__PURE__ */ React4.createElement("div", null, "Hello, World!");
};
export {
  Fallback,
  HelloWorld,
  Hydrate,
  Viewer
};
//# sourceMappingURL=index.js.map
