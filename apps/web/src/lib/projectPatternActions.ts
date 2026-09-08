import { isInternalProjectPdf, type Project, type ProjectPdfPattern } from '../domain/Project';
import { deleteProject, loadProject, updateProject } from './projectsRepository';
import { deleteProjectPattern, uploadProjectPattern } from './projectPatternsRepository';

export class ProjectWriteError extends Error {
  remote: Project | null | undefined;
  constructor(message: string, remote: Project | null | undefined) { super(message); this.remote = remote; }
}
export async function saveProjectConfirmed(candidate: Project, confirms: (remote: Project) => boolean): Promise<Project> {
  try { return await updateProject(candidate); }
  catch {
    const remote = await loadProject(candidate.id);
    if (remote.status === 'found' && confirms(remote.project)) return remote.project;
    if (remote.status === 'found') throw new ProjectWriteError('Salvataggio non riuscito. Il progetto è stato riallineato ai dati salvati.', remote.project);
    if (remote.status === 'not_found') throw new ProjectWriteError('Progetto non trovato.', null);
    throw new ProjectWriteError('Esito del salvataggio incerto. Ricarica i progetti prima di riprovare; il file è stato conservato.', undefined);
  }
}
async function cleanup(projectId: string, pattern: ProjectPdfPattern): Promise<string | undefined> {
  try { await deleteProjectPattern(projectId, pattern); }
  catch {
    // No signed URLs or raw network errors in logs.
    console.warn('Project PDF cleanup failed; unreferenced file preserved.', { projectId, fileId: pattern.fileId, storagePath: pattern.storagePath });
    return 'Modifica salvata, ma non è stato possibile eliminare un file precedente dallo Storage.';
  }
}
export type ProjectPatternResult = { project: Project; warning?: string };
export async function changeProjectCounter(current: Project, delta: number): Promise<ProjectPatternResult> {
  const value = current.workState.primaryCounter.value + delta;
  if (!Number.isSafeInteger(value) || value < 0 || Math.abs(delta) !== 1) return { project: current };
  const candidate = { ...current, workState: { ...current.workState, primaryCounter: { ...current.workState.primaryCounter, value } } };
  return { project: await saveProjectConfirmed(candidate, remote => remote.workState.primaryCounter.value === value) };
}
export async function changeProjectPdfPage(current: Project, fileId: string, page: number): Promise<ProjectPatternResult> {
  if (!isInternalProjectPdf(current.pattern) || current.pattern.fileId !== fileId || !Number.isSafeInteger(page) || page < 1 || current.pattern.viewerState?.page === page) return { project: current };
  const candidate = { ...current, pattern: { ...current.pattern, viewerState: { page } } };
  return { project: await saveProjectConfirmed(candidate, remote => isInternalProjectPdf(remote.pattern) && remote.pattern.fileId === fileId && remote.pattern.viewerState?.page === page) };
}
export async function attachProjectPdf(current: Project, pattern: ProjectPdfPattern, file: File): Promise<ProjectPatternResult> {
  await uploadProjectPattern(current.id, pattern, file);
  let saved: Project;
  try {
    saved = await saveProjectConfirmed({ ...current, pattern }, remote =>
      isInternalProjectPdf(remote.pattern) && remote.pattern.fileId === pattern.fileId && remote.pattern.storagePath === pattern.storagePath);
  } catch (error) {
    // Only an authoritative, usable remote result permits compensation.
    if (error instanceof ProjectWriteError && error.remote !== undefined) {
      const remotePattern = error.remote?.pattern;
      const referencesNew = remotePattern?.type === 'pdf' &&
        (remotePattern.fileId === pattern.fileId || remotePattern.storagePath === pattern.storagePath);
      if (!referencesNew) await cleanup(current.id, pattern);
    }
    throw error;
  }
  const old = current.pattern;
  const warning = isInternalProjectPdf(old) && old.storagePath !== pattern.storagePath
    ? await cleanup(current.id, old) : undefined;
  return { project: saved, warning };
}
export async function removeProjectPdf(current: Project): Promise<ProjectPatternResult> {
  const old = current.pattern;
  const saved = await saveProjectConfirmed({ ...current, pattern: undefined }, remote => !remote.pattern);
  return { project: saved, warning: isInternalProjectPdf(old) ? await cleanup(current.id, old) : undefined };
}
export async function deleteProjectWithPattern(current: Project): Promise<string | undefined> {
  try { await deleteProject(current.id); }
  catch {
    const remote = await loadProject(current.id);
    if (remote.status !== 'not_found') throw new ProjectWriteError(
      'Eliminazione non confermata. Il PDF è stato conservato. Ricarica prima di riprovare.',
      remote.status === 'found' ? remote.project : undefined);
  }
  return isInternalProjectPdf(current.pattern) ? cleanup(current.id, current.pattern) : undefined;
}

// One queue per authenticated App instance. Operations read the latest confirmed
// Project when they start; no stale full-JSON snapshots are accepted by the UI.
export function createProjectWriteQueue(
  get: (id: string) => Project | undefined,
  commit: (id: string, project: Project | null) => void,
) {
  const tails = new Map<string, Promise<unknown>>();
  const blocked = new Set<string>();
  let closed = false;
  async function enqueue(id: string, operation: (current: Project) => Promise<{ project: Project | null; warning?: string }>): Promise<string | undefined> {
    if (closed) throw new Error('Ricaricamento dei progetti in corso.');
    const previous = tails.get(id) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      if (closed) throw new Error('Ricaricamento dei progetti in corso.');
      if (blocked.has(id)) throw new Error('Ricarica i progetti per verificare il salvataggio precedente.');
      const current = get(id);
      if (!current) throw new Error('Progetto non disponibile.');
      try {
        const result = await operation(current);
        commit(id, result.project);
        return result.warning;
      } catch (error) {
        if (error instanceof ProjectWriteError) {
          if (error.remote === undefined) blocked.add(id);
          else commit(id, error.remote);
        }
        throw error;
      }
    });
    tails.set(id, next);
    void next.finally(() => { if (tails.get(id) === next) tails.delete(id); }).catch(() => {});
    return next;
  }
  enqueue.close = async () => {
    closed = true;
    await Promise.allSettled([...tails.values()]);
  };
  return enqueue;
}
