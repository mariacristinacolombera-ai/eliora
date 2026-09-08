import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Project } from "../domain/Project";
import { createProjectId } from "../lib/createProjectId";
import "./ProjectsShell.css";

export type ProjectsLoadState = "idle" | "loading" | "ready" | "error";
type Props = {
  mode: "list" | "new" | "detail" | "edit";
  projects: Project[];
  loadState: ProjectsLoadState;
  onRetry: () => void;
  onCreate: (project: Project) => Promise<void>;
  onUpdate: (project: Project) => Promise<void>;
};

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return year > 0 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

function startLabel(value?: string) {
  if (!value) return undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarDate(value) : new Date(value);
  return date && Number.isFinite(date.getTime())
    ? `Iniziato il ${date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}` : undefined;
}

function CreateProject({ onCreate }: Pick<Props, "onCreate">) {
  const navigate = useNavigate();
  // Like Recipes: allocate once in authoring and preserve across save attempts.
  const [id] = useState(() => createProjectId());
  const [title, setTitle] = useState("");
  const [startedAt, setStartedAt] = useState(todayLocal);
  const [errors, setErrors] = useState<{ title?: string; date?: string; save?: string }>({});
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const nextErrors = {
      title: title.trim() ? undefined : "Inserisci un titolo.",
      date: calendarDate(startedAt) ? undefined : "Inserisci una data di inizio valida.",
    };
    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.date) return;
    pending.current = true;
    setSaving(true);
    try {
      await onCreate({ id, title: title.trim(), startedAt, status: "in_progress", workState: { primaryCounter: { value: 0 } } });
      navigate(`/projects/${encodeURIComponent(id)}`);
    } catch {
      setErrors({ save: "Impossibile creare il progetto. Riprova." });
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return <>
    <h1>Nuovo progetto</h1>
    <p>Bastano un nome e una data per iniziare.</p>
    <form className="projects-form" noValidate onSubmit={submit} aria-busy={saving}>
      <div>
        <label htmlFor="project-title">Titolo *</label>
        <input id="project-title" value={title} onChange={(event) => setTitle(event.target.value)} required disabled={saving} aria-invalid={!!errors.title} aria-describedby={errors.title ? "project-title-error" : undefined} />
        {errors.title && <p className="projects-error" id="project-title-error" role="alert">{errors.title}</p>}
      </div>
      <div>
        <label htmlFor="project-start">Data di inizio *</label>
        <input id="project-start" type="date" min="0001-01-01" max="9999-12-31" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} required disabled={saving} aria-invalid={!!errors.date} aria-describedby={errors.date ? "project-date-error" : undefined} />
        {errors.date && <p className="projects-error" id="project-date-error" role="alert">{errors.date}</p>}
      </div>
      {errors.save && <p className="projects-error" role="alert">{errors.save}</p>}
      <button className="eliora-button--primary" disabled={saving} type="submit">{saving ? "Salvataggio..." : "Inizia progetto"}</button>
    </form>
  </>;
}

function Workspace({ project, onUpdate }: { project: Project } & Pick<Props, "onUpdate">) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const value = project.workState.primaryCounter.value;
  async function changeCounter(delta: number) {
    if (pending.current || value + delta < 0 || !Number.isSafeInteger(value + delta)) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      await onUpdate({ ...project, workState: { ...project.workState, primaryCounter: { ...project.workState.primaryCounter, value: value + delta } } });
    } catch {
      setError("Contatore non salvato. Il valore precedente è stato mantenuto. Riprova.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return <>
    <h1>{project.title}</h1>
    {startLabel(project.startedAt) && <p>{startLabel(project.startedAt)}</p>}
    <section className="projects-counter" aria-labelledby="counter-title" aria-busy={saving}>
      <h2 id="counter-title">Contatore</h2>
      <div className="projects-counter__controls">
        <button className="eliora-button--secondary" aria-label="Diminuisci contatore" disabled={saving || value <= 0} onClick={() => void changeCounter(-1)}>−</button>
        <output aria-live="polite" aria-label="Valore contatore">{value}</output>
        <button className="eliora-button--secondary" aria-label="Aumenta contatore" disabled={saving || !Number.isSafeInteger(value + 1)} onClick={() => void changeCounter(1)}>+</button>
      </div>
      <p className="projects-counter__status" role="status">{saving ? "Salvataggio..." : ""}</p>
      {error && <p className="projects-error" role="alert">{error}</p>}
    </section>
    <Link className="projects-details" to={`/projects/${encodeURIComponent(project.id)}/edit`}>Dettagli progetto <span aria-hidden="true">›</span></Link>
    {!project.pattern && <section className="projects-pattern">
      <h2>Aggiungi modello</h2><p>Per averlo qui mentre lavori</p>
      <button className="eliora-button--secondary" disabled>Prossimamente</button>
    </section>}
  </>;
}

export default function ProjectsShell({ mode, projects, loadState, onRetry, onCreate, onUpdate }: Props) {
  const { id } = useParams();
  const project = projects.find((entry) => entry.id === id);
  return <main className="projects-shell surface-paper">
    <div className="projects-shell__content">
      <nav aria-label="Navigazione progetti"><Link to="/">Home</Link>{" · "}<Link to="/projects">Progetti</Link></nav>
      {loadState === "error" ? <div role="alert"><h1>Progetti</h1><p>Impossibile caricare i progetti.</p><button className="eliora-button--secondary" type="button" onClick={onRetry}>Riprova</button></div>
        : loadState !== "ready" ? <p role="status">Caricamento progetti…</p>
        : mode === "new" ? <CreateProject onCreate={onCreate} />
        : mode === "list" ? <>
          <h1>Progetti</h1>
          <Link className="eliora-button--primary projects-create-link" to="/projects/new">Nuovo progetto</Link>
          {projects.length === 0 ? <p>Nessun progetto. Inizia da qui il tuo prossimo lavoro.</p> : <ul className="projects-list">{projects.map((entry) => <li key={entry.id}>
            <Link to={`/projects/${encodeURIComponent(entry.id)}`}><strong>{entry.title}</strong>{startLabel(entry.startedAt) && <span>{startLabel(entry.startedAt)}</span>}</Link>
          </li>)}</ul>}
        </> : !project ? <><h1>Progetto non trovato</h1><Link to="/projects">Torna ai progetti</Link></>
        : mode === "detail" ? <Workspace key={project.id} project={project} onUpdate={onUpdate} />
        : <><h1>Dettagli progetto</h1><h2>{project.title}</h2><p>Potrai completare qui i dettagli del tuo progetto prossimamente.</p><Link to={`/projects/${encodeURIComponent(project.id)}`}>Torna al lavoro</Link></>}
    </div>
  </main>;
}
