import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const defaultDoc = { markdown: '' };
const DRAFT_PREFIX = 'canopy-creator-draft:';

function parseDocument(source) {
  const raw = typeof source === 'string' ? source : '';
  return { markdown: raw };
}

function composeDocument(doc, overrides) {
  const markdown =
    overrides && typeof overrides.markdown === 'string'
      ? overrides.markdown
      : doc.markdown || '';
  return markdown && markdown.endsWith('\n') ? markdown : `${markdown}\n`;
}

function readDraft(file) {
  if (typeof window === 'undefined' || !file) return null;
  try {
    const raw = window.localStorage.getItem(`${DRAFT_PREFIX}${file}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.markdown === 'string') return parsed;
  } catch (_) {}
  return null;
}

function writeDraft(file, values) {
  if (typeof window === 'undefined' || !file) return;
  try {
    const payload = { markdown: values && values.markdown ? values.markdown : '' };
    window.localStorage.setItem(`${DRAFT_PREFIX}${file}`, JSON.stringify(payload));
  } catch (_) {}
}

function clearDraft(file) {
  if (typeof window === 'undefined' || !file) return;
  try {
    window.localStorage.removeItem(`${DRAFT_PREFIX}${file}`);
  } catch (_) {}
}

function CreatorForm({ values, onChange, onPreview, onSave, disabled }) {
  const current = values || { markdown: '' };
  const handleFieldChange = (event) => {
    onChange({ markdown: event.target.value });
  };
  return (
    <div className="creator-editor">
      <div className="creator-editor__actions">
        <button type="button" onClick={() => onPreview(current)} disabled={disabled}>
          Preview
        </button>
        <button type="button" onClick={() => onSave(current)} disabled={disabled}>
          Save
        </button>
      </div>
      <div className="creator-editor__field">
        <label>Markdown</label>
        <textarea
          value={current.markdown || ''}
          onChange={handleFieldChange}
          rows={24}
          placeholder="Write Markdown and component markup…"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function CreatorApp() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [doc, setDoc] = useState(defaultDoc);
  const [formValues, setFormValues] = useState({ markdown: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [autoPreviewReady, setAutoPreviewReady] = useState(false);
  const latestPreviewRef = useRef(0);
  const previewTimerRef = useRef(null);
  const docRef = useRef(defaultDoc);

  useEffect(() => {
    let cancelled = false;
    const loadFiles = async () => {
      try {
        const response = await fetch('/__creator/files');
        const data = await response.json();
        if (cancelled) return;
        const list = Array.isArray(data.files) ? data.files : [];
        setFiles(list);
        setSelectedFile((prev) => prev || list[0] || '');
      } catch (error) {
        console.warn('Failed to load creator files', error);
      }
    };
    loadFiles();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePreview = useCallback(
    async (values, docOverride) => {
      if (!selectedFile) return;
      const requestId = ++latestPreviewRef.current;
      try {
        const sourceDoc = docOverride || docRef.current;
        const contents = composeDocument(sourceDoc, values);
        const response = await fetch('/creator/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: selectedFile, contents }),
        });
        const html = await response.text();
        if (latestPreviewRef.current === requestId) {
          setPreviewHtml(html || '');
          setPreviewKey((key) => key + 1);
        }
      } catch (error) {
        if (latestPreviewRef.current === requestId) {
          setStatus('Preview failed');
        }
      }
    },
    [selectedFile]
  );

  const handleSave = useCallback(
    async (values) => {
      if (!selectedFile) return;
      try {
        setStatus('Saving…');
        const contents = composeDocument(docRef.current, values);
        const response = await fetch(`/__creator/content?file=${encodeURIComponent(selectedFile)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        });
        if (!response.ok) throw new Error('Save failed');
        const parsed = parseDocument(contents);
        setDoc(parsed);
        docRef.current = parsed;
        const next = { markdown: parsed.markdown || values.markdown || '' };
        setFormValues(next);
        clearDraft(selectedFile);
        handlePreview(next, parsed);
        setStatus('Saved');
        setTimeout(() => setStatus(''), 2500);
      } catch (error) {
        setStatus('Save failed');
      }
    },
    [doc, selectedFile, handlePreview]
  );

  const schedulePreview = useCallback(
    (values, immediate = false) => {
      if (!selectedFile) return;
      if (!autoPreviewReady && !immediate) return;
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      const delay = immediate ? 0 : 400;
      previewTimerRef.current = window.setTimeout(() => {
        handlePreview(values);
      }, delay);
    },
    [autoPreviewReady, selectedFile, handlePreview]
  );

  useEffect(() => {
    if (!selectedFile) return undefined;
    let cancelled = false;
    const loadFile = async () => {
      setLoading(true);
      setStatus('');
      setAutoPreviewReady(false);
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      try {
        const response = await fetch(`/__creator/content?file=${encodeURIComponent(selectedFile)}`);
        if (!response.ok) throw new Error('Failed to load file');
        const data = await response.json();
        if (cancelled) return;
        const parsed = parseDocument(data && data.contents ? data.contents : '');
        setDoc(parsed);
        docRef.current = parsed;
        const draft = readDraft(selectedFile);
        const initialValues =
          draft && typeof draft.markdown === 'string'
            ? { markdown: draft.markdown }
            : { markdown: parsed.markdown || '' };
        setFormValues(initialValues);
        setPreviewHtml('');
        setPreviewKey((key) => key + 1);
        latestPreviewRef.current += 1;
        setAutoPreviewReady(true);
        handlePreview(initialValues, parsed);
      } catch (error) {
        if (!cancelled) {
          setStatus('Unable to load file');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadFile();
    return () => {
      cancelled = true;
    };
  }, [selectedFile, handlePreview]);

  useEffect(() => () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
  }, []);

  const handleFormChange = useCallback(
    (nextValues) => {
      if (!selectedFile) {
        setFormValues(nextValues);
        return;
      }
      setFormValues(nextValues);
      writeDraft(selectedFile, nextValues);
      schedulePreview(nextValues);
    },
    [selectedFile, schedulePreview]
  );

  return (
    <div className="creator-shell">
      <aside className="creator-sidebar">
        <h2>Pages</h2>
        {files.length === 0 && <p className="creator-muted">No MDX files detected.</p>}
        <ul>
          {files.map((file) => (
            <li key={file}>
              <button
                type="button"
                className={file === selectedFile ? 'active' : ''}
                onClick={() => setSelectedFile(file)}
              >
                {file}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="creator-main">
        {selectedFile ? (
          <>
            <header className="creator-main__header">
              <div>
                <h1>{selectedFile}</h1>
                {status && <span className="creator-status">{status}</span>}
              </div>
            </header>
            <CreatorForm
              values={formValues}
              onChange={handleFormChange}
              onPreview={(values) => schedulePreview(values, true)}
              onSave={handleSave}
              disabled={loading}
            />
            <section className="creator-preview">
              <h3>Preview</h3>
              {previewHtml ? (
                <iframe
                  key={previewKey}
                  title="Creator preview"
                  srcDoc={previewHtml}
                  className="creator-preview__frame"
                />
              ) : (
                <div className="creator-muted">Click Preview to render the current draft.</div>
              )}
            </section>
          </>
        ) : (
          <p className="creator-muted">Select a file from the sidebar to start editing.</p>
        )}
      </main>
    </div>
  );
}

function mountCreator() {
  if (typeof document === 'undefined') return;
  const rootEl = document.getElementById('creator-root');
  if (!rootEl) return;
  const root = createRoot(rootEl);
  root.render(<CreatorApp />);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    mountCreator();
  } else {
    window.addEventListener('DOMContentLoaded', mountCreator, { once: true });
  }
}
