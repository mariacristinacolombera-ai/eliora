import { Component, lazy, Suspense, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isInternalProjectPdf, type Project, type ProjectPdfPattern } from '../domain/Project';
import { createProjectPatternTarget } from '../lib/projectPatternsRepository';

const ProjectPdfViewer = lazy(() => import('./ProjectPdfViewer'));
class ProjectPdfErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p className="projects-error" role="alert">Il lettore PDF non è disponibile. <button className="eliora-button--secondary" onClick={() => window.location.reload()}>Ricarica pagina</button></p>
      : this.props.children;
  }
}
export type ProjectWorkspaceActions = {
  onCounterChange: (id: string, delta: number) => Promise<void>;
  onPageChange: (id: string, fileId: string, page: number) => Promise<void>;
  onAttachPdf: (id: string, pattern: ProjectPdfPattern, file: File) => Promise<string | undefined>;
  onRemovePdf: (id: string) => Promise<string | undefined>;
  onDeleteProject: (id: string) => Promise<string | undefined>;
};
function message(error: unknown) { return error instanceof Error ? error.message : 'Operazione non riuscita. Riprova.'; }

export default function ProjectWorkspace({ project, startLabel, onRetry, ...actions }: { project: Project; startLabel?: string; onRetry: () => void } & ProjectWorkspaceActions) {
  const [savingCounter, setSavingCounter] = useState(false);
  const [counterError, setCounterError] = useState('');
  const counterPending = useRef(false);
  const [busy, setBusy] = useState('');
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const value = project.workState.primaryCounter.value;
  const pdf = isInternalProjectPdf(project.pattern) ? project.pattern : undefined;
  async function changeCounter(delta: number) {
    if (counterPending.current) return;
    counterPending.current = true; setSavingCounter(true); setCounterError('');
    try { await actions.onCounterChange(project.id, delta); }
    catch (error) { setCounterError(message(error)); }
    finally { counterPending.current = false; setSavingCounter(false); }
  }
  async function attach(file: File) {
    if (pending.current) return;
    pending.current = true; setError(''); setWarning(''); setBusy('Verifica PDF...');
    try {
      const target = await createProjectPatternTarget(project.id);
      const { validateProjectPdf } = await import('../lib/projectPdfRuntime');
      await validateProjectPdf(file);
      setBusy('Caricamento e salvataggio...');
      setWarning(await actions.onAttachPdf(project.id, { ...target, title: file.name }, file) ?? '');
    } catch (error) { setError(message(error)); }
    finally { pending.current = false; setBusy(''); if (input.current) input.current.value = ''; }
  }
  async function remove() {
    if (pending.current || !window.confirm('Rimuovere il modello da questo progetto?')) return;
    pending.current = true; setBusy('Rimozione...'); setError(''); setWarning('');
    try { setWarning(await actions.onRemovePdf(project.id) ?? ''); }
    catch (error) { setError(message(error)); }
    finally { pending.current = false; setBusy(''); }
  }
  return <div className={pdf ? 'project-workspace project-workspace--pdf' : 'project-workspace'}>
    <header><h1>{project.title}</h1>{startLabel && <p>{startLabel}</p>}</header>
    <section className="projects-counter" aria-labelledby="counter-title" aria-busy={savingCounter}>
      <h2 id="counter-title">Contatore</h2>
      <div className="projects-counter__controls">
        <button className="eliora-button--secondary" aria-label="Diminuisci contatore" disabled={savingCounter || value <= 0} onClick={() => void changeCounter(-1)}>−</button>
        <output aria-live="polite" aria-label="Valore contatore">{value}</output>
        <button className="eliora-button--secondary" aria-label="Aumenta contatore" disabled={savingCounter || !Number.isSafeInteger(value + 1)} onClick={() => void changeCounter(1)}>+</button>
      </div>
      <p className="projects-counter__status" role="status">{savingCounter ? 'Salvataggio...' : ''}</p>
      {counterError && <p className="projects-error" role="alert">{counterError} <button className="eliora-button--ghost" onClick={onRetry}>Ricarica progetti</button></p>}
    </section>
    <Link className="projects-details" to={`/projects/${encodeURIComponent(project.id)}/edit`}>Dettagli progetto <span aria-hidden="true">›</span></Link>
    <input ref={input} type="file" accept="application/pdf,.pdf" hidden aria-label="Scegli modello PDF" onChange={event => { const file = event.target.files?.[0]; if (file) void attach(file); }} />
    <section className={project.pattern ? 'projects-pattern-actions' : 'projects-pattern'} aria-busy={!!busy}>
      {!project.pattern && <><h2>Aggiungi modello</h2><p>Un PDF da avere qui mentre lavori · massimo 5 MiB</p></>}
      {pdf?.title && <p className="projects-pattern-title">{pdf.title}</p>}
      {project.pattern && !pdf && <p>Questo riferimento non è un PDF interno disponibile. Puoi sostituirlo con un PDF locale.</p>}
      <div className="projects-pattern-buttons">
        <button className="eliora-button--secondary" disabled={!!busy} onClick={() => input.current?.click()}>{project.pattern ? 'Sostituisci modello' : 'Aggiungi modello'}</button>
        {project.pattern && <button className="eliora-button--ghost" disabled={!!busy} onClick={() => void remove()}>Rimuovi modello</button>}
      </div>
      {busy && <p role="status">{busy}</p>}
      {error && <p className="projects-error" role="alert">{error} <button className="eliora-button--ghost" onClick={onRetry}>Ricarica progetti</button></p>}
      {warning && <p role="status">{warning}</p>}
    </section>
    {pdf && <ProjectPdfErrorBoundary key={`${pdf.fileId}:${pdf.storagePath}`}><Suspense fallback={<p role="status">Caricamento lettore PDF...</p>}><ProjectPdfViewer projectId={project.id} pattern={pdf} onPageChange={actions.onPageChange} onReloadProject={onRetry} /></Suspense></ProjectPdfErrorBoundary>}
  </div>;
}

export function DeleteProjectAction({ project, onDeleteProject }: { project: Project } & Pick<ProjectWorkspaceActions, 'onDeleteProject'>) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function remove() {
    if (pending.current || !window.confirm('Eliminare il progetto e il suo modello PDF?')) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const warning = await onDeleteProject(project.id);
      navigate('/projects', { state: { projectWarning: warning } });
    } catch (error) { setError(message(error)); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="projects-delete"><button className="eliora-button--destructive" disabled={busy} onClick={() => void remove()}>{busy ? 'Eliminazione...' : 'Elimina progetto'}</button>{error && <p role="alert" className="projects-error">{error}</p>}</div>;
}
