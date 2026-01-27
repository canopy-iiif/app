import React from "react";

function parseHighlightAttr(attr) {
  if (!attr) return new Set();
  const cleaned = String(attr || "").trim();
  if (!cleaned) return new Set();
  const segments = cleaned
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const lines = new Set();
  for (const segment of segments) {
    if (!segment) continue;
    if (/^\d+-\d+$/.test(segment)) {
      const [startRaw, endRaw] = segment.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        for (let i = start; i <= end; i += 1) {
          lines.add(i);
        }
      }
    } else if (/^\d+$/.test(segment)) {
      const value = Number(segment);
      if (Number.isFinite(value)) lines.add(value);
    }
  }
  return lines;
}

function normaliseCode(children) {
  if (children == null) return "";
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children
      .map((child) => (typeof child === "string" ? child : ""))
      .join("");
  }
  if (typeof children === "object" && typeof children.toString === "function") {
    return children.toString();
  }
  return "";
}

const baseLineStyle = {
  display: "block",
  padding: "0.125rem 1.25rem",
  boxSizing: "border-box",
};

const highlightBaseStyle = {
  background:
    "linear-gradient(to right, var(--color-accent-200, #bfdbfe), var(--color-accent-100, #bfdbfe))",
};

export default function DocsCodeBlock(props = {}) {
  const {children, ...rest} = props;
  const childArray = React.Children.toArray(children);
  const codeElement = childArray.find((el) => React.isValidElement(el));
  if (!codeElement || !codeElement.props) {
    return React.createElement("pre", props);
  }

  const {
    className = "",
    children: codeChildren,
    ...codeProps
  } = codeElement.props;
  const rawCode = normaliseCode(codeChildren);
  const trimmedCode = rawCode.endsWith("\n") ? rawCode.slice(0, -1) : rawCode;
  const lines = trimmedCode.split("\n");
  const filename = codeProps["data-filename"] || "";
  const highlightAttr = codeProps["data-highlight"] || "";
  const highlightSet = parseHighlightAttr(highlightAttr);
  const copyAttr = codeProps["data-copy"];
  const enableCopy =
    copyAttr !== undefined
      ? copyAttr === true || copyAttr === "true" || copyAttr === ""
      : false;

  const [copied, setCopied] = React.useState(false);
  const buttonRef = React.useRef(null);

  const handleCopy = React.useCallback(async () => {
    const text = trimmedCode;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 5000);
    } catch (_) {
      setCopied(false);
    }
  }, [trimmedCode]);

  React.useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.setAttribute("data-docs-copy-hydrated", "true");
    }
  }, []);

  React.useEffect(() => {
    if (!buttonRef.current) return;
    if (copied) buttonRef.current.setAttribute("data-docs-copy-active", "true");
    else buttonRef.current.removeAttribute("data-docs-copy-active");
  }, [copied]);

  const containerStyle = {
    borderRadius: "12px",
    overflow: "hidden",
    margin: "1.5rem 0",
    background: "var(--color-accent-100)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8333rem",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.25rem",
    fontWeight: 700,
    background: "var(--color-accent-100)",
    borderBottom: "1px solid var(--color-accent-200)",
    color: "var(--color-gray-900)",
  };

  const preStyle = {
    margin: 0,
    background: "var(--color-accent-100)",
    color: "var(--color-accent-800)",
    lineHeight: 1.55,
    padding: "1rem 0",
    overflowX: "auto",
  };

  const buttonStyle = {
    border: "1px solid var(--color-accent-200, )",
    borderRadius: "6px",
    padding: "0.25rem 0.65rem",
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "var(--color-accent-default)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    background: "var(--docs-copy-bg, rgba(255,255,255,0.08))",
    transform: "var(--docs-copy-transform, scale(1))",
    transition:
      "transform 150ms ease, background-color 150ms ease, color 150ms ease",
  };

  const codeStyle = {
    display: "block",
    padding: 0,
  };

  const lineContentStyle = {
    whiteSpace: "pre",
    display: "inline",
  };

  const showFilename = Boolean(filename);
  const showHeader = showFilename || enableCopy;

  const {style: preStyleOverride, className: preClassName, ...preRest} = rest;
  const mergedPreStyle = Object.assign({}, preStyle, preStyleOverride || {});

  const lineElements = lines.map((line, index) => {
    const lineNumber = index + 1;
    const highlight = highlightSet.has(lineNumber);
    const style = highlight
      ? {...baseLineStyle, ...highlightBaseStyle}
      : baseLineStyle;
    const displayLine = line === "" ? " " : line;
    return React.createElement(
      "span",
      {
        key: lineNumber,
        style,
        "data-docs-code-line": line,
      },
      React.createElement("span", {style: lineContentStyle}, displayLine),
    );
  });

  return React.createElement(
    "div",
    {
      style: containerStyle,
      "data-docs-code-block": "true",
    },
    showHeader
      ? React.createElement(
          "div",
          {style: headerStyle},
          React.createElement("span", null, showFilename ? filename : null),
          enableCopy
            ? React.createElement(
                "button",
                {
                  ref: buttonRef,
                  type: "button",
                  onClick: handleCopy,
                  "aria-live": "polite",
                  "aria-label": copied
                    ? "Copied to clipboard"
                    : "Copy code to clipboard",
                  "data-docs-copy-button": "true",
                  style: buttonStyle,
                },
                React.createElement("span", null, "Copy"),
                React.createElement(
                  "span",
                  {
                    "aria-hidden": "true",
                    "data-docs-copy-icon": "true",
                  },
                  "\u2713",
                ),
              )
            : null,
        )
      : null,
    enableCopy
      ? React.createElement("textarea", {
          "data-docs-copy-source": "true",
          tabIndex: -1,
          readOnly: true,
          "aria-hidden": "true",
          defaultValue: trimmedCode,
          style: {
            position: "absolute",
            left: "-9999px",
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          },
        })
      : null,
    React.createElement(
      "pre",
      {...preRest, className: preClassName, style: mergedPreStyle},
      React.createElement("code", {style: codeStyle}, lineElements),
    ),
  );
}
