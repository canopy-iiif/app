import React from "react";

export default function Container({
  className = "",
  variant = "content",
  children,
  ...rest
}) {
  const variantClass = variant === "wide" ? "max-w-wide" : "max-w-content";
  const classes = ["mx-auto", variantClass, "w-full", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      {...rest}
      style={{...rest.style, padding: "1.618rem"}}
    >
      {children}
    </div>
  );
}
