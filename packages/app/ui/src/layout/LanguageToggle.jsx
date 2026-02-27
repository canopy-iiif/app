import React from "react";
import getSafePageContext from "./pageContext.js";
import {
  buildLanguageToggleConfig,
  LanguageToggleControl,
} from "./languageToggleShared.jsx";

export default function LanguageToggle({
  languageToggle,
  page,
  variant = "inline",
  className = "",
  showLabel = false,
  control,
  label,
  ariaLabel,
}) {
  const PageContext = getSafePageContext();
  const context = React.useContext(PageContext);
  const siteLanguageToggle =
    (context && context.site && context.site.languageToggle) || null;
  const pageData = page || (context && context.page ? context.page : null);
  const resolvedToggle =
    languageToggle === false
      ? null
      : languageToggle === true || typeof languageToggle === "undefined"
      ? siteLanguageToggle
      : languageToggle;
  const normalizeControl = (value) =>
    value === "list" ? "list" : value === "select" ? "select" : null;
  const toggleControl = normalizeControl(
    resolvedToggle && typeof resolvedToggle.control === "string"
      ? resolvedToggle.control
      : null,
  );
  const resolvedControl =
    normalizeControl(typeof control === "string" ? control : null) ||
    toggleControl ||
    "select";
  const config = React.useMemo(() => {
    if (!resolvedToggle) return null;
    const base = buildLanguageToggleConfig(resolvedToggle, pageData);
    if (!base) return null;
    return {
      ...base,
      label: typeof label === "string" ? label : base.label,
      ariaLabel: typeof ariaLabel === "string" ? ariaLabel : base.ariaLabel,
    };
  }, [resolvedToggle, pageData, label, ariaLabel]);

  if (!config) return null;

  return (
    <LanguageToggleControl
      config={config}
      variant={variant}
      className={className}
      showLabel={showLabel}
      control={resolvedControl}
    />
  );
}
