import type { ProjectPdfPattern } from '../domain/Project';
import { supabase } from './supabase';

export const PROJECT_PDF_MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'project-patterns';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function createProjectPatternFileId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (!globalThis.crypto?.getRandomValues) throw new Error('Generazione sicura ID non disponibile.');
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function segment(value: string) {
  if (!value || value !== value.trim() || /[/\\]/.test(value) || [...value].some(char => char.charCodeAt(0) < 32) || value === '.' || value === '..') {
    throw new Error('Riferimento file non valido.');
  }
  return value;
}
export function buildProjectPatternStoragePath(userId: string, projectId: string, fileId: string) {
  if (!UUID.test(fileId)) throw new Error('ID file non valido.');
  return `${segment(userId)}/${segment(projectId)}/${fileId}.pdf`;
}
async function userId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Sessione non disponibile. Accedi di nuovo.');
  return user.id;
}
export async function createProjectPatternTarget(projectId: string): Promise<ProjectPdfPattern> {
  const fileId = createProjectPatternFileId();
  return { type: 'pdf', fileId, storagePath: buildProjectPatternStoragePath(await userId(), projectId, fileId), viewerState: { page: 1 } };
}
export async function validateProjectPatternPath(projectId: string, pattern: ProjectPdfPattern) {
  if (pattern.storagePath !== buildProjectPatternStoragePath(await userId(), projectId, pattern.fileId)) {
    throw new Error('Il file non appartiene a questo progetto o utente.');
  }
}
export function validateProjectPdfSize(file: Blob) {
  if (!file.size) throw new Error('Il file è vuoto.');
  if (file.size > PROJECT_PDF_MAX_BYTES) throw new Error('Il PDF deve essere al massimo 5 MiB.');
}
export async function uploadProjectPattern(projectId: string, pattern: ProjectPdfPattern, file: File) {
  validateProjectPdfSize(file);
  await validateProjectPatternPath(projectId, pattern);
  const { error } = await supabase.storage.from(BUCKET).upload(pattern.storagePath, file, { contentType: 'application/pdf', upsert: false });
  if (error) throw new Error('Caricamento PDF non riuscito. Riprova.');
}
export async function deleteProjectPattern(projectId: string, pattern: ProjectPdfPattern) {
  await validateProjectPatternPath(projectId, pattern);
  const { error } = await supabase.storage.from(BUCKET).remove([pattern.storagePath]);
  if (error) throw new Error('Pulizia del file non riuscita.');
}
export async function createProjectPatternSignedUrl(projectId: string, pattern: ProjectPdfPattern) {
  await validateProjectPatternPath(projectId, pattern);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pattern.storagePath, 3600);
  if (error || !data?.signedUrl) throw new Error('PDF non disponibile. Riprova.');
  return data.signedUrl;
}
export async function downloadProjectPattern(projectId: string, pattern: ProjectPdfPattern, signal: AbortSignal): Promise<Uint8Array> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const url = await createProjectPatternSignedUrl(projectId, pattern);
    signal.throwIfAborted();
    const response = await fetch(url, { signal, referrerPolicy: 'no-referrer' });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      // One renewal only. Never log response URLs or tokens.
      if (attempt === 0 && [400, 401, 403].includes(response.status)) continue;
      throw new Error('Impossibile scaricare il PDF. Verifica la connessione e riprova.');
    }
    if (Number(response.headers.get('content-length')) > PROJECT_PDF_MAX_BYTES) {
      await response.body?.cancel().catch(() => {});
      throw new Error('PDF troppo grande.');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Download PDF non disponibile.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > PROJECT_PDF_MAX_BYTES) throw new Error('PDF troppo grande.');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    if (!size) throw new Error('Il PDF è vuoto.');
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  }
  throw new Error('Accesso al PDF scaduto. Riprova.');
}
