import React from 'react';
import navigationHelpers from '../../../lib/components/navigation.js';
import SubNavigation from './SubNavigation.jsx';
import ContentNavigation from './ContentNavigation.jsx';

function buildHeadingTree(headings) {
  if (!Array.isArray(headings) || !headings.length) return [];
  const root = [];
  const stack = [];
  headings.forEach((heading) => {
    if (!heading || typeof heading !== 'object') return;
    const depth = typeof heading.depth === 'number' ? heading.depth : heading.level;
    if (typeof depth !== 'number' || depth < 2) return;
    const entry = {
      id: heading.id || heading.slug || heading.title,
      title: heading.title || heading.text || heading.id,
      depth,
      children: [],
    };
    while (stack.length && stack[stack.length - 1].depth >= entry.depth) {
      stack.pop();
    }
    if (!stack.length) {
      root.push(entry);
    } else {
      stack[stack.length - 1].children.push(entry);
    }
    stack.push(entry);
  });
  return root;
}

function buildNavigationAside(sidebar, className) {
  if (!sidebar) {
    return <SubNavigation className={className} />;
  }
  if (typeof sidebar === 'function') {
    return React.createElement(sidebar);
  }
  return sidebar;
}

export default function Layout({
  children,
  sidebar,
  navigation = true,
  fluid = false,
  contentNavigation = true,
  className = '',
  contentClassName = '',
  sidebarClassName = '',
  contentNavigationClassName = '',
  ...rest
}) {
  const PageContext =
    navigationHelpers && typeof navigationHelpers.getPageContext === 'function'
      ? navigationHelpers.getPageContext()
      : null;
  const context = PageContext ? React.useContext(PageContext) : null;
  const pageHeadings = React.useMemo(() => {
    const headings = context && context.page ? context.page.headings : null;
    return Array.isArray(headings) ? headings : [];
  }, [context]);
  const contentHeading = React.useMemo(() => {
    const first = pageHeadings.find((heading) => {
      const depth = heading && (heading.depth || heading.level);
      return depth === 1;
    });
    return first && first.title ? first.title : null;
  }, [pageHeadings]);
  const headingAnchorId = React.useMemo(() => {
    const first = pageHeadings.find((heading) => {
      const depth = heading && (heading.depth || heading.level);
      return depth === 1;
    });
    return first && first.id ? first.id : null;
  }, [pageHeadings]);
  const headingTree = React.useMemo(
    () => buildHeadingTree(pageHeadings),
    [pageHeadings]
  );

  const showLeftColumn = navigation !== false;
  const hasContentNavigation =
    navigation !== false &&
    contentNavigation !== false &&
    headingTree.length > 0;

  const gridClass = (() => {
    if (showLeftColumn && hasContentNavigation) {
      return 'md:grid md:grid-cols-[17rem_minmax(0,1fr)_14rem] md:items-start md:gap-10';
    }
    if (showLeftColumn) {
      return 'md:grid md:grid-cols-[17rem_minmax(0,1fr)] md:items-start md:gap-10';
    }
    if (hasContentNavigation) {
      return 'md:grid md:grid-cols-[minmax(0,1fr)_14rem] md:items-start md:gap-10';
    }
    return '';
  })();

  const containerClassName = [
    'w-full py-6 getting-started-layout',
    gridClass,
    fluid ? 'px-4 md:px-8 lg:px-12' : 'mx-auto max-w-content px-4',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const leftAsideClassName = [
    'mt-8 md:mt-0 md:order-1 md:sticky md:top-24 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto text-sm text-slate-600',
    sidebarClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const contentOrderClass = showLeftColumn ? 'md:order-2' : hasContentNavigation ? 'md:order-1' : '';
  const contentClassNames = [
    'space-y-6',
    contentOrderClass,
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const contentNavigationAsideClassName = [
    'hidden md:block md:order-3 mt-8 md:mt-0 md:sticky md:top-24 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto text-sm text-slate-600',
    contentNavigationClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const sidebarNode = showLeftColumn
    ? buildNavigationAside(sidebar, sidebarClassName)
    : null;

  return (
    <div className={containerClassName} {...rest}>
      {showLeftColumn ? (
        <aside className={leftAsideClassName}>{sidebarNode}</aside>
      ) : null}
      <div className={contentClassNames}>{children}</div>
      {hasContentNavigation ? (
        <aside className={contentNavigationAsideClassName}>
          <ContentNavigation
            items={headingTree}
            heading={contentHeading || undefined}
            headingId={headingAnchorId || undefined}
            pageTitle={context && context.page ? context.page.title : undefined}
          />
        </aside>
      ) : null}
    </div>
  );
}
