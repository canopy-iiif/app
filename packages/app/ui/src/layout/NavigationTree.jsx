import React from "react";

function normalizeDepth(depth) {
  if (typeof depth !== "number") return 0;
  return Math.max(0, Math.min(5, depth));
}

function NavigationTreeList({nodes, depth, parentKey}) {
  if (!Array.isArray(nodes) || !nodes.length) return null;
  const listClasses = ["canopy-nav-tree__list"];
  if (depth > 0) listClasses.push("canopy-nav-tree__list--nested");
  return (
    <ul className={listClasses.join(" ")} role="list">
      {nodes.map((node, index) => (
        <NavigationTreeItem
          key={node.slug || node.href || node.title || `${parentKey}-${index}`}
          node={node}
          depth={depth}
          nodeKey={`${parentKey}-${index}`}
        />
      ))}
    </ul>
  );
}

function NavigationTreeItem({node, depth, nodeKey}) {
  if (!node) return null;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isRoadmap = !!node.isRoadmap;
  const isInteractive = !!(node.href && !isRoadmap);
  const Tag = isInteractive ? "a" : "span";
  const depthClass = `depth-${normalizeDepth(depth + 1)}`;
  const classes = ["canopy-nav-tree__link", depthClass];
  if (!isInteractive && !isRoadmap) classes.push("is-label");
  if (isRoadmap) classes.push("is-disabled");
  if (node.isActive) classes.push("is-active");
  const isRootLevel = depth < 0;
  const panelId = hasChildren ? `canopy-section-${nodeKey}` : null;
  const allowToggle = hasChildren && !isRootLevel;
  const defaultExpanded = allowToggle ? !!node.isExpanded : true;
  const toggleLabel = node.title
    ? `Toggle ${node.title} menu`
    : "Toggle section menu";

  return (
    <li
      className="canopy-nav-tree__item"
      data-depth={depth}
      data-canopy-nav-item={allowToggle ? "true" : undefined}
      data-expanded={
        allowToggle ? (defaultExpanded ? "true" : "false") : undefined
      }
      data-default-expanded={
        allowToggle && defaultExpanded ? "true" : undefined
      }
    >
      <div className="canopy-nav-tree__row">
        <div className="canopy-nav-tree__link-wrapper">
          <Tag
            className={classes.join(" ")}
            href={isInteractive ? node.href : undefined}
            aria-current={node.isActive ? "page" : undefined}
            tabIndex={isInteractive ? undefined : -1}
          >
            {node.title || node.slug}
            {isRoadmap ? (
              <span className="canopy-nav-tree__badge">Roadmap</span>
            ) : null}
          </Tag>
        </div>
        {allowToggle ? (
          <button
            type="button"
            className="canopy-nav-tree__toggle"
            aria-expanded={defaultExpanded ? "true" : "false"}
            aria-controls={panelId || undefined}
            aria-label={toggleLabel}
            data-canopy-nav-item-toggle={panelId || undefined}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="canopy-nav-tree__toggle-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 9l7 7 7-7"
              />
            </svg>
            <span className="sr-only">{toggleLabel}</span>
          </button>
        ) : null}
      </div>
      {hasChildren ? (
        <div
          id={panelId || undefined}
          className="canopy-nav-tree__children"
          aria-hidden={
            allowToggle ? (defaultExpanded ? "false" : "true") : "false"
          }
          hidden={allowToggle ? !defaultExpanded : undefined}
        >
          <NavigationTreeList
            nodes={node.children}
            depth={depth + 1}
            parentKey={nodeKey}
          />
        </div>
      ) : null}
    </li>
  );
}

export default function NavigationTree({
  root,
  className = "",
  parentKey = "nav",
  includeRoot = false,
  heading,
  headingClassName = "canopy-nav-tree__heading",
  component: Component = "div",
  ...rest
}) {
  if (!root) return null;
  const nodes = includeRoot ? [root] : root.children;
  if (!Array.isArray(nodes) || !nodes.length) return null;
  const combinedClassName = ["canopy-nav-tree", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Component
      className={combinedClassName}
      data-canopy-nav-tree="true"
      {...rest}
    >
      {heading ? <div className={headingClassName}>{heading}</div> : null}
      <NavigationTreeList
        nodes={nodes}
        depth={includeRoot ? -1 : 0}
        parentKey={parentKey}
      />
    </Component>
  );
}
