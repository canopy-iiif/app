import React from "react";
import navigationHelpers from "../../../lib/components/navigation.js";

function resolveRelativeCandidate(page, current) {
  if (page && typeof page.relativePath === "string" && page.relativePath)
    return page.relativePath;
  if (page && typeof page.slug === "string" && page.slug) return page.slug;
  if (typeof current === "string" && current) return current;
  return "";
}

function renderNodes(nodes, parentKey = "node") {
  if (!Array.isArray(nodes) || !nodes.length) return null;
  return nodes.map((node, index) => {
    if (!node) return null;
    const key = node.slug || node.relativePath || `${parentKey}-${index}`;
    const hasChildren =
      Array.isArray(node.children) && node.children.length > 0;
    const showChildren = hasChildren && (node.isExpanded || node.depth === 0);
    const depth = typeof node.depth === "number" ? Math.max(0, node.depth) : 0;
    const depthClass = `depth-${Math.min(depth, 5)}`;
    const isRoadmap = !!node.isRoadmap;
    const isInteractive = !!(node.href && !isRoadmap);
    const classes = ["canopy-sub-navigation__link", depthClass];
    if (!node.href && !isRoadmap) classes.push("is-label");
    if (isRoadmap) classes.push("is-disabled");
    if (node.isActive) classes.push("is-active");
    const linkClass = classes.join(" ");
    const Tag = isInteractive ? "a" : "span";
    const badge = isRoadmap ? (
      <span className="canopy-sub-navigation__badge">Roadmap</span>
    ) : null;
    return (
      <li key={key} className="canopy-sub-navigation__item" data-depth={depth}>
        <Tag
          className={linkClass}
          href={isInteractive ? node.href : undefined}
          aria-current={node.isActive ? "page" : undefined}
          tabIndex={isInteractive ? undefined : -1}
        >
          {node.title || node.slug}
          {badge}
        </Tag>
        {showChildren ? (
          <ul
            className="canopy-sub-navigation__list canopy-sub-navigation__list--nested"
            role="list"
          >
            {renderNodes(node.children, key)}
          </ul>
        ) : null}
      </li>
    );
  });
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
      {finalHeading ? (
        <div className="canopy-sub-navigation__heading">{finalHeading}</div>
      ) : null}
      <ul className="canopy-sub-navigation__list" role="list">
        {renderNodes([rootNode], rootNode.slug || "root")}
      </ul>
    </nav>
  );
}
