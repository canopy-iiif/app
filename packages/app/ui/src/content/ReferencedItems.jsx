import React from "react";
import navigationHelpers from "../../../lib/components/navigation.js";
import Card from "../layout/Card.jsx";

function useReferencedItems(itemsProp) {
  if (Array.isArray(itemsProp)) return itemsProp;
  const PageContext =
    navigationHelpers && typeof navigationHelpers.getPageContext === "function"
      ? navigationHelpers.getPageContext()
      : null;
  if (!PageContext) return [];
  const context = React.useContext(PageContext);
  const items = context && context.page ? context.page.referencedItems : null;
  return Array.isArray(items) ? items : [];
}

export default function ReferencedItems({
  items: itemsProp,
  emptyLabel = null,
  className = "",
  children,
  ...rest
}) {
  const items = useReferencedItems(itemsProp);
  const hasItems = items.length > 0;

  if (!hasItems) {
    if (!emptyLabel) return null;
    const emptyClass = [
      "referenced-items",
      "referenced-items--empty",
      className,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div className={emptyClass} {...rest}>
        {typeof emptyLabel === "function" ? emptyLabel() : emptyLabel}
      </div>
    );
  }

  const containerClassName = ["referenced-items", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={containerClassName} {...rest}>
      {children}
      <div className="referenced-items__grid" role="list">
        {items.map((item) => {
          if (!item) return null;
          const key = item.href || item.slug || item.id;
          return (
            <div className="referenced-items__item" role="listitem" key={key}>
              <Card
                href={item.href}
                src={item.thumbnail}
                imgWidth={item.thumbnailWidth}
                imgHeight={item.thumbnailHeight}
                title={item.title}
                subtitle={item.summary}
                className="referenced-items__card"
                lazy={false}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
