function computeHeroHeightStyle(height) {
  const h = typeof height === 'number' ? `${height}px` : String(height || '').trim();
  const val = h || '360px';
  return { width: '100%', height: val };
}

export { computeHeroHeightStyle };
export default computeHeroHeightStyle;
