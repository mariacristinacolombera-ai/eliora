import type {
  Project, ProjectPattern, ProjectWorkState, ProjectYarnQuantity,
} from "./Project";

export type NormalizeProjectIssue = { path: string; code: string; message: string };
export type NormalizeProjectResult =
  | { ok: true; project: Project; issues: NormalizeProjectIssue[] }
  | { ok: false; project: null; issues: NormalizeProjectIssue[] };

type RecordValue = Record<string, unknown>;
function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeProject(input: unknown): NormalizeProjectResult {
  const issues: NormalizeProjectIssue[] = [];
  function issue(path: string, code: string, message: string) {
    issues.push({ path, code, message });
  }
  function string(value: unknown, path: string): string | undefined {
    const result = typeof value === "string" ? value.trim() || undefined : undefined;
    if (value !== undefined && !result) issue(path, "invalid_string", "Unusable string omitted.");
    return result;
  }
  function object(value: unknown, path: string): RecordValue | undefined {
    if (isRecord(value)) return value;
    if (value !== undefined) issue(path, "invalid_object", "Invalid object omitted.");
    return undefined;
  }
  function date(value: unknown, path: string, required = false) {
    const result = typeof value === "string" ? value.trim() : "";
    if (result && Number.isFinite(Date.parse(result))) return result;
    if (required || value !== undefined) issue(path, "missing_or_invalid_date", "No usable date; no replacement invented.");
    return undefined;
  }
  function number(value: unknown, path: string, minimum: number, integer = false) {
    if (typeof value === "number" && Number.isFinite(value) && value >= minimum && (!integer || Number.isInteger(value))) return value;
    if (value !== undefined) issue(path, "invalid_number", "Number outside the allowed range omitted.");
    return undefined;
  }
  function url(value: unknown, path: string) {
    if (value === undefined) return undefined;
    const candidate = typeof value === "string" ? value.trim() : "";
    try {
      const parsed = new URL(candidate);
      if (/^https?:\/\//i.test(candidate) && (parsed.protocol === "http:" || parsed.protocol === "https:")) return candidate;
    } catch { /* Report invalid URLs below. */ }
    issue(path, "invalid_url", "Only absolute HTTP/HTTPS URLs are supported.");
    return undefined;
  }
  function entries(value: unknown, path: string): RecordValue[] {
    // Preserve original indices for deterministic legacy IDs, including invalid entries.
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      issue(path, "invalid_array", "Invalid collection omitted.");
      return [];
    }
    return value.map((entry, index) => object(entry, `${path}[${index}]`) ?? {});
  }
  const root = object(input, "$") ?? {};
  const id = string(root.id, "id");
  const title = string(root.title, "title");
  if (!id) issue("id", "missing_required_string", "Project requires a usable ID.");
  if (!title) issue("title", "missing_required_string", "Project requires a usable title.");
  if (!id || !title) return { ok: false, project: null, issues };

  function nestedIds(collection: RecordValue[], kind: "yarn" | "needle" | "update") {
    // Reserve even later explicit IDs before allocating any fallback.
    const reserved = new Set(collection.flatMap((entry) =>
      typeof entry.id === "string" && entry.id.trim() ? [entry.id.trim()] : [],
    ));
    const assigned = new Set<string>();
    return (value: unknown, index: number, path: string): string | undefined => {
      const existing = string(value, `${path}.id`);
      if (existing) {
        if (assigned.has(existing)) {
          issue(`${path}.id`, "duplicate_explicit_id", "Duplicate explicit ID: later recoverable element omitted; first preserved.");
          return undefined;
        }
        assigned.add(existing);
        return existing;
      }
      const base = `legacy-${kind}:${id}:${index}`;
      let candidate = base;
      let suffix = 1;
      while (reserved.has(candidate) || assigned.has(candidate)) {
        candidate = `${base}:${suffix++}`;
      }
      if (candidate !== base) issue(`${path}.id`, "disambiguated_legacy_id", "Legacy ID collision resolved with a deterministic numeric suffix.");
      issue(`${path}.id`, "generated_runtime_id", "Generated a deterministic legacy ID.");
      assigned.add(candidate);
      return candidate;
    };
  }
  const candidateCompletedAt = date(root.completedAt, "completedAt");
  const status = root.status === "completed" || root.status === "in_progress"
    ? root.status : candidateCompletedAt ? "completed" : "in_progress";
  if (root.status !== "completed" && root.status !== "in_progress") issue("status", "defaulted_status", `Status defaulted to ${status}.`);
  if (status === "completed" && !candidateCompletedAt) issue("completedAt", "missing_completion_date", "Completed status preserved without a date.");
  if (status === "in_progress" && root.completedAt !== undefined) issue("completedAt", "inconsistent_completion_date", "Completion date omitted for an in-progress project.");

  const rawWork = object(root.workState, "workState");
  const rawPrimary = object(rawWork?.primaryCounter, "workState.primaryCounter");
  const primaryValue = number(rawPrimary?.value, "workState.primaryCounter.value", 0, true);
  if (primaryValue === undefined) issue("workState.primaryCounter.value", "defaulted_counter", "Missing or invalid counter value replaced with zero.");
  const workState: ProjectWorkState = { primaryCounter: { value: primaryValue ?? 0 } };
  const target = number(rawPrimary?.target, "workState.primaryCounter.target", 1, true);
  if (target !== undefined) workState.primaryCounter.target = target;
  const phase = string(rawWork?.phase, "workState.phase");
  const instruction = string(rawWork?.instruction, "workState.instruction");
  if (phase) workState.phase = phase;
  if (instruction) workState.instruction = instruction;
  const secondary = object(rawWork?.secondaryCounter, "workState.secondaryCounter");
  if (secondary) {
    const value = number(secondary.value, "workState.secondaryCounter.value", 0, true);
    if (value === undefined) issue("workState.secondaryCounter.value", "defaulted_counter", "Missing or invalid counter value replaced with zero.");
    workState.secondaryCounter = { value: value ?? 0 };
    const resetEvery = number(secondary.resetEvery, "workState.secondaryCounter.resetEvery", 1, true);
    if (resetEvery !== undefined) workState.secondaryCounter.resetEvery = resetEvery;
  }

  let pattern: ProjectPattern | undefined;
  const rawPattern = object(root.pattern, "pattern");
  if (rawPattern) {
    if (rawPattern.type === "web") {
      const patternUrl = url(rawPattern.url, "pattern.url");
      if (patternUrl) pattern = { type: "web", url: patternUrl };
    } else if (rawPattern.type === "pdf") {
      const fileId = string(rawPattern.fileId, "pattern.fileId");
      // Preserve an existing object key verbatim, even if unusable for this user.
      // Only the Storage repository may validate/resolve it; normalization never deletes files.
      const storagePath = typeof rawPattern.storagePath === "string" && rawPattern.storagePath.trim()
        ? rawPattern.storagePath : undefined;
      if (rawPattern.storagePath !== undefined && !storagePath) issue("pattern.storagePath", "invalid_storage_path", "Unusable Storage reference.");
      if (storagePath && (!/^[^/\\]+\/[^/\\]+\/[^/\\]+\.pdf$/.test(storagePath) || storagePath !== storagePath.trim())) {
        issue("pattern.storagePath", "invalid_storage_path", "Storage reference preserved for recovery; cannot be used without validation.");
      }
      const patternUrl = storagePath ? undefined : url(rawPattern.url, "pattern.url");
      if (storagePath && rawPattern.url !== undefined) issue("pattern.url", "omitted_internal_url", "Internal PDFs use Storage references, never persisted access URLs.");
      if (!fileId || !storagePath) issue("pattern", "legacy_pdf_reference", "Incomplete internal PDF reference preserved; no upload invented.");
      if (fileId || storagePath || patternUrl) pattern = { type: "pdf", ...(fileId ? { fileId } : {}), ...(storagePath ? { storagePath } : {}), ...(patternUrl ? { url: patternUrl } : {}) };
    } else if (rawPattern.type === "image") {
      const fileIds: string[] = [];
      if (Array.isArray(rawPattern.fileIds)) {
        rawPattern.fileIds.forEach((value, index) => {
          const fileId = string(value, `pattern.fileIds[${index}]`);
          if (!fileId) return;
          if (fileIds.includes(fileId)) issue(`pattern.fileIds[${index}]`, "duplicate_file_id", "Duplicate image reference removed.");
          else fileIds.push(fileId);
        });
      } else issue("pattern.fileIds", "invalid_array", "Image references must be an array.");
      if (fileIds.length) pattern = { type: "image", fileIds };
    }
    if (!pattern) issue("pattern", "invalid_pattern", "Pattern omitted because its type or required references are invalid.");
    else {
      const patternTitle = string(rawPattern.title, "pattern.title");
      const sourceUrl = url(rawPattern.sourceUrl, "pattern.sourceUrl");
      if (patternTitle) pattern.title = patternTitle;
      if (sourceUrl) pattern.sourceUrl = sourceUrl;
      const viewer = object(rawPattern.viewerState, "pattern.viewerState");
      if (viewer) {
        const page = number(viewer.page, "pattern.viewerState.page", 1, true);
        const scrollPosition = pattern.type === "pdf" ? undefined : number(viewer.scrollPosition, "pattern.viewerState.scrollPosition", 0);
        if (pattern.type === "pdf" && viewer.scrollPosition !== undefined) issue("pattern.viewerState.scrollPosition", "omitted_pdf_scroll", "PDFs restore page only.");
        if (page !== undefined || scrollPosition !== undefined) pattern.viewerState = {
          ...(page !== undefined ? { page } : {}), ...(scrollPosition !== undefined ? { scrollPosition } : {}),
        };
      }
    }
  }
  function quantity(value: unknown, path: string): ProjectYarnQuantity | undefined {
    const raw = object(value, path);
    if (!raw) return undefined;
    const amount = number(raw.amount, `${path}.amount`, 0);
    if (amount !== undefined && (raw.unit === "g" || raw.unit === "skeins")) return { amount, unit: raw.unit };
    issue(path, "invalid_quantity", "Quantity requires a non-negative finite amount and g or skeins unit.");
    return undefined;
  }
  const yarnEntries = entries(root.yarns, "yarns");
  const yarnId = nestedIds(yarnEntries, "yarn");
  const yarns = yarnEntries.flatMap((entry, index) => {
    const path = `yarns[${index}]`;
    const name = string(entry.name, `${path}.name`);
    if (!name) { issue(path, "invalid_yarn", "Yarn without a usable name removed."); return []; }
    const entryId = yarnId(entry.id, index, path);
    if (!entryId) return [];
    return [{ id: entryId, name,
      color: string(entry.color, `${path}.color`),
      recommendedQuantity: quantity(entry.recommendedQuantity, `${path}.recommendedQuantity`),
      usedQuantity: quantity(entry.usedQuantity, `${path}.usedQuantity`),
    }];
  });
  const needleEntries = entries(root.needles, "needles");
  const needleId = nestedIds(needleEntries, "needle");
  const needles = needleEntries.flatMap((entry, index) => {
    const path = `needles[${index}]`;
    const sizeMm = number(entry.sizeMm, `${path}.sizeMm`, 0);
    if (sizeMm === undefined || sizeMm === 0) { issue(path, "invalid_needle", "Needle without a positive finite size removed."); return []; }
    const entryId = needleId(entry.id, index, path);
    if (!entryId) return [];
    return [{ id: entryId, sizeMm, purpose: string(entry.purpose, `${path}.purpose`) }];
  });
  const updateEntries = entries(root.updates, "updates");
  const updateId = nestedIds(updateEntries, "update");
  const updates = updateEntries.flatMap((entry, index) => {
    const path = `updates[${index}]`;
    const text = string(entry.text, `${path}.text`);
    const photoId = string(entry.photoId, `${path}.photoId`);
    if (!text && !photoId) { issue(path, "empty_update", "Update without text or a photo reference removed."); return []; }
    const entryId = updateId(entry.id, index, path);
    if (!entryId) return [];
    return [{ id: entryId, text, photoId, createdAt: date(entry.createdAt, `${path}.createdAt`, true) }];
  });
  const rawCompletion = object(root.completion, "completion");
  const finalPhotoId = string(rawCompletion?.finalPhotoId, "completion.finalPhotoId");
  const resultNotes = string(rawCompletion?.resultNotes, "completion.resultNotes");
  const blockingNotes = string(rawCompletion?.blockingNotes, "completion.blockingNotes");
  const project: Project = {
    id, title, status, workState,
    startedAt: date(root.startedAt, "startedAt", true),
    completedAt: status === "completed" ? candidateCompletedAt : undefined,
    description: string(root.description, "description"),
    selectedSize: string(root.selectedSize, "selectedSize"),
    pattern,
    yarns: yarns.length ? yarns : undefined,
    needles: needles.length ? needles : undefined,
    updates: updates.length ? updates : undefined,
    completion: finalPhotoId || resultNotes || blockingNotes ? { finalPhotoId, resultNotes, blockingNotes } : undefined,
  };
  return { ok: true, project, issues };
}
