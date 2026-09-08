export function clampProjectPdfPage(page: number | undefined, count: number) {
  return Math.min(Math.max(Number.isSafeInteger(page) ? page! : 1, 1), count);
}

// Small per-viewer debounce. The App Project queue owns write serialization.
export function createProjectPagePersistence(save: (page: number) => Promise<void>, status: (state: 'saving' | 'saved' | 'error') => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: number | undefined;
  let last = 1;
  let version = 0;
  async function flush() {
    clearTimeout(timer);
    if (pending === undefined) return;
    const page = pending;
    pending = undefined;
    const attempt = version;
    status('saving');
    try { await save(page); if (attempt === version) status('saved'); }
    catch { if (attempt === version) status('error'); }
  }
  return {
    schedule(page: number) { last = pending = page; version++; clearTimeout(timer); timer = setTimeout(() => void flush(), 500); },
    retry() { pending = last; version++; return flush(); },
    flush,
  };
}
