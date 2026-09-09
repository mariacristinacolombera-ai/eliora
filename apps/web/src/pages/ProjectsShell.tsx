import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Project } from "../domain/Project";
import { createProjectId } from "../lib/createProjectId";
import "./ProjectsShell.css";
import ProjectWorkspace, { type ProjectWorkspaceActions } from "./ProjectWorkspace";

export type ProjectsLoadState = "idle" | "loading" | "ready" | "error";
type Props = ProjectWorkspaceActions & {
  mode: "list" | "new" | "detail" | "edit";
  projects: Project[];
  loadState: ProjectsLoadState;
  onRetry: () => void;
  onCreate: (project: Project) => Promise<void>;
  onUpdate: (id: string, details: Pick<Project, "title" | "startedAt">,
) => Promise<void>;
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

function EditProject({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: Props["onUpdate"];
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(project.title);
  const [startedAt, setStartedAt] = useState(project.startedAt ?? "");
  const [errors, setErrors] = useState<{
    title?: string;
    date?: string;
    save?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;

    const nextErrors = {
      title: title.trim() ? undefined : "Inserisci un titolo.",
      date: calendarDate(startedAt)
        ? undefined
        : "Inserisci una data di inizio valida.",
    };

    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.date) return;

    pending.current = true;
    setSaving(true);

    try {
      await onUpdate(project.id, {
        title: title.trim(),
        startedAt,
      });

      navigate(`/projects/${encodeURIComponent(project.id)}`);
    } catch {
      setErrors({
        save: "Impossibile salvare le modifiche. Riprova.",
      });
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Modifica progetto</h1>

      <form
        className="projects-form"
        noValidate
        onSubmit={submit}
        aria-busy={saving}
      >
        <div>
          <label htmlFor="project-edit-title">Titolo *</label>
          <input
            id="project-edit-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            disabled={saving}
            aria-invalid={!!errors.title}
            aria-describedby={
              errors.title ? "project-edit-title-error" : undefined
            }
          />
          {errors.title && (
            <p
              className="projects-error"
              id="project-edit-title-error"
              role="alert"
            >
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="project-edit-start">Data di inizio *</label>
          <input
            id="project-edit-start"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
            required
            disabled={saving}
            aria-invalid={!!errors.date}
            aria-describedby={
              errors.date ? "project-edit-date-error" : undefined
            }
          />
          {errors.date && (
            <p
              className="projects-error"
              id="project-edit-date-error"
              role="alert"
            >
              {errors.date}
            </p>
          )}
        </div>

        {errors.save && (
          <p className="projects-error" role="alert">
            {errors.save}
          </p>
        )}

        <button
          className="eliora-button--primary"
          disabled={saving}
          type="submit"
        >
          {saving ? "Salvataggio..." : "Salva modifiche"}
        </button>
      </form>
    </>
  );
}


export default function ProjectsShell({ mode, projects, loadState, onRetry, onCreate, onUpdate, ...actions }: Props) {
  const { id } = useParams();
  const location = useLocation();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const project = projects.find((entry) => entry.id === id);
  return <main className="projects-shell surface-paper">
    <div className="projects-shell__content">
      <nav aria-label="Navigazione progetti"><Link to="/">Home</Link>{" · "}<Link to="/projects">Progetti</Link></nav>
      {loadState === "error" ? <div role="alert"><h1>Progetti</h1><p>Impossibile caricare i progetti.</p><button className="eliora-button--secondary" type="button" onClick={onRetry}>Riprova</button></div>
        : loadState !== "ready" ? <p role="status">Caricamento progetti…</p>
        : mode === "new" ? <CreateProject onCreate={onCreate} />
        : mode === "list" ? <>
          <h1>Progetti</h1>
          {typeof location.state?.projectWarning === "string" && <p role="status">{location.state.projectWarning}</p>}
          <Link className="eliora-button--primary projects-create-link" to="/projects/new">Nuovo progetto</Link>
          {projects.length === 0 ? <p>Nessun progetto. Inizia da qui il tuo prossimo lavoro.</p> : <ul className="projects-list">
  {projects.map((entry) => (
    <li key={entry.id} className="projects-list__item">
      <Link
        className="projects-list__link"
        to={`/projects/${encodeURIComponent(entry.id)}`}
      >
        <strong>{entry.title}</strong>
        {startLabel(entry.startedAt) && (
          <span>{startLabel(entry.startedAt)}</span>
        )}
      </Link>

     <div className="projects-list__menu">
  <button
    className="projects-list__menu-button"
    type="button"
    aria-label={`Azioni per ${entry.title}`}
    aria-expanded={openMenuId === entry.id}
    onClick={() =>
      setOpenMenuId((current) =>
        current === entry.id ? null : entry.id
      )
    }
  >
    •••
  </button>

  {openMenuId === entry.id && (
    <div className="projects-list__menu-popover">
      <Link
        to={`/projects/${encodeURIComponent(entry.id)}/edit`}
        onClick={() => setOpenMenuId(null)}
      >
        Modifica progetto
      </Link>

      <button
  type="button"
  onClick={() => {
    setOpenMenuId(null);

    if (window.confirm(`Eliminare il progetto "${entry.title}"?`)) {
      actions.onDeleteProject(entry.id);
    }
  }}
>
  Elimina progetto
</button>
    </div>
  )}
</div>
    </li>
  ))}
</ul> }
        </> : !project ? <><h1>Progetto non trovato</h1><Link to="/projects">Torna ai progetti</Link></>
        : mode === "detail" ? <ProjectWorkspace key={project.id} project={project} startLabel={startLabel(project.startedAt)} onRetry={onRetry} {...actions} />
        : <EditProject
    project={project}
    onUpdate={onUpdate}
  /> }</div>
  </main>;
}
