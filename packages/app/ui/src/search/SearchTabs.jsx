import React from 'react';

export default function SearchTabs({ type = 'all', onTypeChange, types = [], counts = {} }) {
  const orderedTypes = Array.isArray(types) ? types : [];
  const toLabel = (t) => (t && t.length ? t.charAt(0).toUpperCase() + t.slice(1) : '');
  return (
    <div role="tablist" aria-label="Search types" className="flex items-center gap-2 border-b border-slate-200">
      {orderedTypes.map((t) => {
        const active = String(type).toLowerCase() === String(t).toLowerCase();
        const cRaw = (counts && Object.prototype.hasOwnProperty.call(counts, t)) ? counts[t] : undefined;
        const c = Number.isFinite(Number(cRaw)) ? Number(cRaw) : 0;
        return (
          <button
            key={t}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onTypeChange && onTypeChange(t)}
            className={
              'px-3 py-1.5 text-sm rounded-t-md border-b-2 -mb-px transition-colors ' +
              (active
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300')
            }
          >
            {toLabel(t)} ({c})
          </button>
        );
      })}
    </div>
  );
}

