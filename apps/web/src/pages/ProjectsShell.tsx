import { Link, useParams } from "react-router-dom";
import type { Project } from "../domain/Project";

export type ProjectsLoadState = "idle" | "loading" | "ready" | "error";
type Props = {
  mode: "list" | "new" | "detail" | "edit";
  projects: Project[];
  loadState: ProjectsLoadState;
  onRetry: () => void;
};

// Temporary route shells. Operational forms, patterns and counters follow later.
export default function ProjectsShell({ mode, projects, loadState, onRetry }: Props) {
  const { id } = useParams();
  const project = projects.find((entry) => entry.id === id);
  return (
    <main>
      <Link to="/">Home</Link>{" · "}<Link to="/projects">Progetti</Link>
      <h1>{mode === "new" ? "Nuovo progetto" : mode === "edit" ? "Modifica progetto" : "Progetti"}</h1>
      <p>Sezione temporanea: l’esperienza operativa è in preparazione.</p>
      {mode === "new" ? <p>La creazione dei progetti sarà disponibile nel prossimo passaggio.</p>
        : loadState === "error" ? <div role="alert"><p>Impossibile caricare i progetti.</p><button type="button" onClick={onRetry}>Riprova</button></div>
        : loadState !== "ready" ? <p role="status">Caricamento progetti…</p>
        : mode === "list" ? <>
          <Link to="/projects/new">Nuovo progetto</Link>
          {projects.length === 0 ? <p>Nessun progetto.</p> : <ul>{projects.map((entry) => <li key={entry.id}><Link to={`/projects/${encodeURIComponent(entry.id)}`}>{entry.title}</Link></li>)}</ul>}
        </> : !project ? <p>Progetto non trovato.</p> : <>
          <h2>{project.title}</h2>
          <p>{project.status === "completed" ? "Completato" : "In corso"}</p>
          {mode === "detail" && <Link to={`/projects/${encodeURIComponent(project.id)}/edit`}>Modifica</Link>}
        </>}
    </main>
  );
}
