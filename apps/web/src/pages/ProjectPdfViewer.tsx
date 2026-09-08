import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import type { ProjectPdfPattern } from '../domain/Project';
import { downloadProjectPattern } from '../lib/projectPatternsRepository';
import { configureProjectPdfWorker, projectPdfOptions } from '../lib/projectPdfRuntime';
import { clampProjectPdfPage, createProjectPagePersistence } from '../lib/projectPdfPageState';
import 'react-pdf/dist/Page/TextLayer.css';
import './ProjectPdfViewer.css';

// Set in the rendering module too, after React-PDF imports have evaluated.
configureProjectPdfWorker();
type Props = { projectId: string; pattern: ProjectPdfPattern; onPageChange: (id: string, fileId: string, page: number) => Promise<void>; onReloadProject: () => void };
export default function ProjectPdfViewer({ projectId, pattern, onPageChange, onReloadProject }: Props) {
  const [bytes, setBytes] = useState<Uint8Array>();
  const [error, setError] = useState('');
  const [renderError, setRenderError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(() => Math.max(1, pattern.viewerState?.page ?? 1));
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(300);
  const [saveStatus, setSaveStatus] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const callback = useRef(onPageChange);
  callback.current = onPageChange;
  const active = useRef(false);
  const reference = useMemo<ProjectPdfPattern>(() => ({ type: 'pdf', fileId: pattern.fileId, storagePath: pattern.storagePath }), [pattern.fileId, pattern.storagePath]);
  const persistence = useMemo(() => createProjectPagePersistence(
    page => callback.current(projectId, reference.fileId, page),
    state => { if (active.current) setSaveStatus(state); },
  ), [projectId, reference.fileId]);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; void persistence.flush(); };
  }, [persistence]);
  useEffect(() => {
    const controller = new AbortController();
    setBytes(undefined); setCount(0); setError(''); setRenderError('');
    downloadProjectPattern(projectId, reference, controller.signal).then(data => {
      if (!controller.signal.aborted) setBytes(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('PDF non disponibile. Verifica la connessione e riprova.');
    });
    return () => controller.abort();
  }, [projectId, reference, attempt]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(160, Math.floor(entries[0].contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const file = useMemo(() => bytes ? { data: bytes } : undefined, [bytes]);
  function changePage(next: number) {
    const clamped = clampProjectPdfPage(next, count);
    setPage(clamped); setRenderError(''); persistence.schedule(clamped);
  }
  function resize(next: number) { setZoom(next); setRenderError(''); }
  return <section className="project-pdf" aria-label="Modello PDF">
    <div className="project-pdf__toolbar">
      <div>
        <button className="eliora-button--secondary" disabled={!count || page <= 1} onClick={() => changePage(page - 1)} aria-label="Pagina precedente">‹</button>
        <span aria-live="polite">{count ? `Pagina ${page} di ${count}` : 'Caricamento PDF...'}</span>
        <button className="eliora-button--secondary" disabled={!count || page >= count} onClick={() => changePage(page + 1)} aria-label="Pagina successiva">›</button>
      </div>
      <div>
        <button className="eliora-button--secondary" disabled={!count || zoom <= 0.75} onClick={() => resize(Math.max(0.75, zoom - 0.25))} aria-label="Riduci zoom">−</button>
        <button className="eliora-button--ghost" disabled={!count} onClick={() => resize(1)}>Adatta</button>
        <button className="eliora-button--secondary" disabled={!count || zoom >= 2} onClick={() => resize(Math.min(2, zoom + 0.25))} aria-label="Aumenta zoom">+</button>
      </div>
    </div>
    {saveStatus === 'saving' && <p role="status">Salvataggio posizione...</p>}
    {saveStatus === 'error' && <p role="alert" className="projects-error">Posizione non salvata. <button className="eliora-button--ghost" onClick={() => void persistence.retry()}>Riprova</button> <button className="eliora-button--ghost" onClick={onReloadProject}>Ricarica progetti</button></p>}
    {error && <p role="alert" className="projects-error">{error} <button className="eliora-button--secondary" onClick={() => setAttempt(value => value + 1)}>Riprova</button></p>}
    {renderError && <p role="alert" className="projects-error">{renderError} <button className="eliora-button--ghost" onClick={() => setAttempt(value => value + 1)}>Ricarica PDF</button></p>}
    <div ref={viewport} className="project-pdf__viewport">
      {file && !error && <Document file={file} options={projectPdfOptions}
        loading={<p role="status">Apertura PDF...</p>}
        error={<p role="alert">Il PDF non può essere letto.</p>}
        onPassword={() => setError('I PDF protetti da password non sono supportati.')}
        onLoadError={() => setError('Il PDF è corrotto o non può essere letto.')}
        onLoadSuccess={({ numPages }) => {
          const clamped = clampProjectPdfPage(page, numPages);
          setCount(numPages); setPage(clamped);
          if (clamped !== page) persistence.schedule(clamped);
        }}>
        {count > 0 && <Page pageNumber={page} width={Math.min(width, 1100)} scale={zoom}
          devicePixelRatio={Math.min(window.devicePixelRatio || 1, 2)}
          renderTextLayer renderAnnotationLayer={false}
          loading={<p role="status">Caricamento pagina...</p>}
          onRenderError={() => setRenderError('Impossibile visualizzare questa pagina. Prova a ridurre lo zoom o ricaricare il PDF.')}
          onGetTextError={() => setRenderError('Testo della pagina non disponibile.')}
        />}
      </Document>}
    </div>
  </section>;
}
