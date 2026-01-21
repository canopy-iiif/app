import React from "react";
import navigationHelpers from "../../../lib/components/navigation.js";
import NavigationTree from "./NavigationTree.jsx";

function resolveRelativeCandidate(page, current) {
  if (page && typeof page.relativePath === "string" && page.relativePath)
    return page.relativePath;
  if (page && typeof page.slug === "string" && page.slug) return page.slug;
  if (typeof current === "string" && current) return current;
  return "";
}

export default function SubNavigation({
  navigation: navigationProp,
  page,
  current,
  className = "",
  style = {},
  heading,
  ariaLabel,
}) {
  const PageContext =
    navigationHelpers && navigationHelpers.getPageContext
      ? navigationHelpers.getPageContext()
      : null;
  const context = PageContext ? React.useContext(PageContext) : null;
  const contextNavigation =
    context && context.navigation ? context.navigation : null;
  const contextPage = context && context.page ? context.page : null;
  const effectiveNavigation = navigationProp || contextNavigation;
  const effectivePage = page || contextPage;
  const resolvedNavigation = React.useMemo(() => {
    if (effectiveNavigation && effectiveNavigation.root)
      return effectiveNavigation;
    const candidate = resolveRelativeCandidate(effectivePage, current);
    if (!candidate) return effectiveNavigation || null;
    const helpers =
      navigationHelpers && navigationHelpers.buildNavigationForFile
        ? navigationHelpers
        : null;
    if (!helpers) return effectiveNavigation || null;
    try {
      const normalized = navigationHelpers.normalizeRelativePath
        ? navigationHelpers.normalizeRelativePath(candidate)
        : candidate;
      const built = helpers.buildNavigationForFile(normalized);
      if (built) return built;
    } catch (_) {
      // ignore helper errors and fall back to provided navigation
    }
    return effectiveNavigation || null;
  }, [effectiveNavigation, effectivePage, current]);

  if (!resolvedNavigation || !resolvedNavigation.root) return null;

  const rootNode = resolvedNavigation.root;
  const finalHeading = heading || null;
  const labelSource = finalHeading || resolvedNavigation.title;
  const navLabel =
    ariaLabel ||
    (labelSource ? `${labelSource} navigation` : "Section navigation");
  const combinedClassName = ["canopy-sub-navigation", className]
    .filter(Boolean)
    .join(" ");
  const inlineStyle = {...style};
  if (!Object.prototype.hasOwnProperty.call(inlineStyle, "--sub-nav-indent")) {
    inlineStyle["--sub-nav-indent"] = "0.85rem";
  }

  return (
    <nav
      className={combinedClassName}
      style={inlineStyle}
      aria-label={navLabel}
    >
      <NavigationTree
        root={rootNode}
        includeRoot
        component="div"
        className="canopy-sub-navigation__tree"
        parentKey={rootNode.slug || "root"}
        heading={finalHeading || undefined}
      />
    </nav>
  );
}
