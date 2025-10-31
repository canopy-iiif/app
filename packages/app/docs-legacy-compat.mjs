import React from 'react';

/**
 * Temporary compatibility shims for legacy Canopy docs.
 * Each component currently renders an empty fragment (<></>) so that pages
 * continue compiling while we replace the old Nextra/Radix UI usages.
 *
 * Comments note the original source for quick triage.
 */

// Nextra component
export function Callout() {
  return React.createElement(React.Fragment, null);
}

// Nextra component
export function Steps() {
  return React.createElement(React.Fragment, null);
}

// Nextra component
export function Cards() {
  return React.createElement(React.Fragment, null);
}

// Nextra component
export function Card() {
  return React.createElement(React.Fragment, null);
}

// Nextra component (namespace with sub-components)
export function Tabs() {
  return React.createElement(React.Fragment, null);
}
Tabs.Root = function TabsRoot() {
  return React.createElement(React.Fragment, null);
};
Tabs.List = function TabsList() {
  return React.createElement(React.Fragment, null);
};
Tabs.Trigger = function TabsTrigger() {
  return React.createElement(React.Fragment, null);
};
Tabs.Content = function TabsContent() {
  return React.createElement(React.Fragment, null);
};

// Nextra component (namespace with sub-components)
export function FileTree() {
  return React.createElement(React.Fragment, null);
}
FileTree.Folder = function FileTreeFolder() {
  return React.createElement(React.Fragment, null);
};
FileTree.File = function FileTreeFile() {
  return React.createElement(React.Fragment, null);
};

// Radix UI component
export function Box() {
  return React.createElement(React.Fragment, null);
}

// Radix UI component
export function Text() {
  return React.createElement(React.Fragment, null);
}

// Radix UI component
export function Section() {
  return React.createElement(React.Fragment, null);
}

// Radix UI component
export function Button() {
  return React.createElement(React.Fragment, null);
}

// Radix UI component
export function Heading() {
  return React.createElement(React.Fragment, null);
}

// Radix UI component
export function Em() {
  return React.createElement(React.Fragment, null);
}

// Radix UI component
export function Strong() {
  return React.createElement(React.Fragment, null);
}

// Radix UI design token helper
export const accentColors = [];

// Radix UI design token helper
export const grayColors = [];

// Custom Canopy component
export function Colors() {
  return React.createElement(React.Fragment, null);
}

// Custom Canopy component
export function ColorsLabeled() {
  return React.createElement(React.Fragment, null);
}

// Custom Canopy component
export function Radius() {
  return React.createElement(React.Fragment, null);
}

// Custom Canopy component
export function Scaling() {
  return React.createElement(React.Fragment, null);
}

// Custom Canopy component
export function Tooltip() {
  return React.createElement(React.Fragment, null);
}

// Custom Canopy component
export function Image() {
  return React.createElement(React.Fragment, null);
}
