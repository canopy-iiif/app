export function buildHeadingTree(headings) {
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

export default {
  buildHeadingTree,
};
