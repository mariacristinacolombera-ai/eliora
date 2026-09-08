// Focused regression checks, without a test-framework dependency or network access.
// Run from apps/web: node scripts/check-project-pattern.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '../src');
function modules(overrides = {}, globals = {}) {
  const cache = new Map();
  function load(name) {
    const filename = path.resolve(root, `${name}.ts`);
    if (cache.has(filename)) return cache.get(filename);
    if (Object.hasOwn(overrides, name)) return overrides[name];
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = { exports: {} };
    cache.set(filename, module.exports);
    vm.runInNewContext(output, {
      module, exports: module.exports,
      require: request => load(path.relative(root, path.resolve(path.dirname(filename), request)).replaceAll('\\', '/')),
      console: { warn() {}, error() {} }, setTimeout, clearTimeout, Uint8Array,
      crypto: webcrypto, fetch, URL, ...globals,
    }, { filename });
    return module.exports;
  }
  return load;
}
const clone = value => JSON.parse(JSON.stringify(value));
const old = { type: 'pdf', fileId: '00000000-0000-4000-8000-000000000001', storagePath: 'u/p/00000000-0000-4000-8000-000000000001.pdf', viewerState: { page: 1 } };
const next = { ...old, fileId: '00000000-0000-4000-8000-000000000002', storagePath: 'u/p/00000000-0000-4000-8000-000000000002.pdf' };
const project = () => ({ id: 'p', title: 'Check', status: 'in_progress', pattern: clone(old), workState: { primaryCounter: { value: 0 } } });
function scenario(options = {}) {
  const events = [];
  let remote = project();
  let local = clone(remote);
  let writes = 0;
  let active = 0;
  let maxActive = 0;
  const load = modules({
    'lib/projectsRepository': {
      async updateProject(candidate) {
        events.push(`save:${candidate.pattern?.fileId ?? 'none'}`); writes++;
        active++; maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setTimeout(resolve, 2)); active--;
        if (!options.saveError || options.saveApplied) remote = clone(candidate);
        if (options.saveError) throw new Error('response lost');
        return clone(remote);
      },
      async loadProject() { events.push('read'); return options.readStatus ? { status: options.readStatus } : { status: 'found', project: clone(remote) }; },
      async deleteProject() { events.push('delete-project'); if (options.deleteError) throw new Error('delete failed'); remote = null; },
    },
    'lib/projectPatternsRepository': {
      async uploadProjectPattern() { events.push('upload'); if (options.uploadError) throw new Error('upload failed'); },
      async deleteProjectPattern(id, pattern) { events.push(`cleanup:${pattern.fileId}`); if (options.cleanupError) throw new Error('cleanup failed'); },
    },
  });
  const actions = load('lib/projectPatternActions');
  const enqueue = actions.createProjectWriteQueue(() => local, (_id, value) => { local = value; });
  return { actions, enqueue, events, get local() { return local; }, get remote() { return remote; }, get writes() { return writes; }, get maxActive() { return maxActive; } };
}

test('F: failed upload never writes or cleans up', async () => {
  const s = scenario({ uploadError: true });
  await assert.rejects(s.actions.attachProjectPdf(project(), next, {}));
  assert.deepEqual(s.events, ['upload']);
});
test('G/J: attach and replacement save before deleting the old file', async () => {
  const s = scenario();
  const result = await s.actions.attachProjectPdf(project(), next, {});
  assert.equal(result.project.pattern.fileId, next.fileId);
  assert.deepEqual(s.events, ['upload', `save:${next.fileId}`, `cleanup:${old.fileId}`]);
  const empty = { ...project(), pattern: undefined };
  const initial = scenario();
  await initial.actions.attachProjectPdf(empty, next, {});
  assert.equal(initial.events.filter(x => x.startsWith('cleanup')).length, 0);
});
test('H/K: confirmed non-association cleans only the new upload and restores the old Project', async () => {
  const s = scenario({ saveError: true });
  await assert.rejects(s.enqueue('p', current => s.actions.attachProjectPdf(current, next, {})));
  assert.equal(s.local.pattern.fileId, old.fileId);
  assert.deepEqual(s.events, ['upload', `save:${next.fileId}`, 'read', `cleanup:${next.fileId}`]);
});
test('I: response lost after save reconciles from remote and only then cleans the old PDF', async () => {
  const s = scenario({ saveError: true, saveApplied: true });
  await s.enqueue('p', current => s.actions.attachProjectPdf(current, next, {}));
  assert.equal(s.local.pattern.fileId, next.fileId);
  assert.deepEqual(s.events, ['upload', `save:${next.fileId}`, 'read', `cleanup:${old.fileId}`]);
});
for (const readStatus of ['invalid', 'read_error']) test(`Inconclusive ${readStatus}: preserves both files and blocks subsequent writes`, async () => {
  const s = scenario({ saveError: true, readStatus });
  await assert.rejects(s.enqueue('p', current => s.actions.attachProjectPdf(current, next, {})));
  await assert.rejects(s.enqueue('p', current => s.actions.changeProjectCounter(current, 1)));
  assert.equal(s.writes, 1);
  assert.equal(s.events.some(x => x.startsWith('cleanup')), false);
});
test('Confirmed not_found compensates upload and removes local Project', async () => {
  const s = scenario({ saveError: true, readStatus: 'not_found' });
  await assert.rejects(s.enqueue('p', current => s.actions.attachProjectPdf(current, next, {})));
  assert.equal(s.local, null);
  assert.equal(s.events.at(-1), `cleanup:${next.fileId}`);
});
test('L/M: remove persists first; cleanup failure leaves the saved Project without a PDF', async () => {
  const s = scenario({ cleanupError: true });
  const warning = await s.enqueue('p', s.actions.removeProjectPdf);
  assert.equal(s.local.pattern, undefined);
  assert.ok(warning);
  assert.deepEqual(s.events, ['save:none', `cleanup:${old.fileId}`]);
  const failure = scenario({ saveError: true });
  await assert.rejects(failure.actions.removeProjectPdf(project()));
  assert.equal(failure.events.some(x => x.startsWith('cleanup')), false);
});
test('R: adjacent page and counter mutations preserve each other and serialize writes', async () => {
  const s = scenario();
  await Promise.all([
    s.enqueue('p', current => s.actions.changeProjectPdfPage(current, old.fileId, 2)),
    s.enqueue('p', current => s.actions.changeProjectCounter(current, 1)),
    s.enqueue('p', current => s.actions.changeProjectPdfPage(current, old.fileId, 3)),
    s.enqueue('p', current => s.actions.changeProjectCounter(current, 1)),
  ]);
  assert.equal(s.maxActive, 1);
  assert.equal(s.remote.pattern.viewerState.page, 3);
  assert.equal(s.remote.workState.primaryCounter.value, 2);
});
test('Old file events after replace/remove do not write or resurrect a pattern', async () => {
  const s = scenario();
  await s.enqueue('p', current => s.actions.attachProjectPdf(current, next, {}));
  await s.enqueue('p', current => s.actions.changeProjectPdfPage(current, old.fileId, 9));
  assert.equal(s.writes, 1);
  assert.equal(s.local.pattern.viewerState.page, 1);
  await s.enqueue('p', s.actions.removeProjectPdf);
  await s.enqueue('p', current => s.actions.changeProjectPdfPage(current, next.fileId, 9));
  assert.equal(s.writes, 2);
  assert.equal(s.local.pattern, undefined);
});
test('Reload closes the old queue, waits for its active write and rejects late events', async () => {
  const s = scenario();
  let release, started;
  const running = new Promise(resolve => { started = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  const write = s.enqueue('p', async current => { started(); await held; return s.actions.changeProjectCounter(current, 1); });
  await running;
  let settled = false;
  const close = s.enqueue.close().then(() => { settled = true; });
  await assert.rejects(s.enqueue('p', current => s.actions.changeProjectPdfPage(current, old.fileId, 3)));
  assert.equal(settled, false);
  release(); await write; await close;
  assert.equal(settled, true);
  assert.equal(s.local.workState.primaryCounter.value, 1);
  assert.equal(s.writes, 1);
});
test('S: delete cleanup follows confirmation, including lost response; uncertain delete preserves file', async () => {
  const s = scenario({ cleanupError: true });
  assert.ok(await s.actions.deleteProjectWithPattern(project()));
  assert.deepEqual(s.events, ['delete-project', `cleanup:${old.fileId}`]);
  const lost = scenario({ deleteError: true, readStatus: 'not_found' });
  await lost.actions.deleteProjectWithPattern(project());
  assert.deepEqual(lost.events, ['delete-project', 'read', `cleanup:${old.fileId}`]);
  for (const readStatus of [undefined, 'invalid', 'read_error']) {
    const failure = scenario({ deleteError: true, readStatus });
    await assert.rejects(failure.actions.deleteProjectWithPattern(project()));
    assert.equal(failure.events.some(x => x.startsWith('cleanup')), false);
  }
});
test('N/P/Q: 1-based clamp, debounce at 500ms, unmount flush and retry', async () => {
  const timers = new Map(); let clockId = 0;
  const { clampProjectPdfPage: clamp, createProjectPagePersistence } = modules({}, {
    setTimeout(fn, ms) { assert.equal(ms, 500); timers.set(++clockId, fn); return clockId; },
    clearTimeout(id) { timers.delete(id); },
  })('lib/projectPdfPageState');
  assert.equal(clamp(99, 3), 3); assert.equal(clamp(0, 3), 1); assert.equal(clamp(undefined, 3), 1);
  const saves = []; const states = []; let fail = false;
  const p = createProjectPagePersistence(async page => { if (fail) throw new Error(); saves.push(page); }, state => states.push(state));
  p.schedule(2); p.schedule(3); p.schedule(2);
  assert.equal(saves.length, 0); assert.equal(timers.size, 1);
  timers.values().next().value();
  await Promise.resolve(); assert.deepEqual(saves, [2]); assert.equal(timers.size, 0);
  p.schedule(1); await p.flush(); assert.deepEqual(saves, [2, 1]);
  fail = true; p.schedule(3); await p.flush(); assert.equal(states.at(-1), 'error');
  fail = false; await p.retry(); assert.deepEqual(saves, [2, 1, 3]);
});
test('Normalization preserves internal path, strips access URL and PDF scroll; legacy remains readable', () => {
  const { normalizeProject } = modules()('domain/normalizeProject');
  const p = project(); p.pattern = { ...old, url: 'https://example.invalid/signed?token=not-a-token', viewerState: { page: 2, scrollPosition: 100 } };
  const result = normalizeProject(p);
  assert.equal(result.ok, true); assert.equal(result.project.pattern.url, undefined);
  assert.equal(result.project.pattern.storagePath, old.storagePath);
  assert.equal(result.project.pattern.viewerState.scrollPosition, undefined);
  p.pattern = { type: 'pdf', url: 'https://example.invalid/legacy.pdf' };
  assert.equal(normalizeProject(p).project.pattern.url, p.pattern.url);
});
test('Storage: secure UUID fallback, path ownership, MIME/upsert options and one URL renewal', async () => {
  const calls = []; let fetchCount = 0;
  const pattern = { ...old };
  const repo = modules({ 'lib/supabase': { supabase: {
    auth: { async getUser() { return { data: { user: { id: 'u' } } }; } },
    storage: { from(bucket) { assert.equal(bucket, 'project-patterns'); return {
      async upload(key, _file, options) { calls.push({ key, options }); return {}; },
      async createSignedUrl() { calls.push('signed'); return { data: { signedUrl: 'https://example.invalid/test-only' } }; },
    }; } },
  } } }, {
    crypto: { getRandomValues: array => webcrypto.getRandomValues(array) },
    async fetch() { return ++fetchCount === 1 ? new Response('', { status: 403 }) : new Response('%PDF-test'); },
  })('lib/projectPatternsRepository');
  const id = repo.createProjectPatternFileId();
  assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.notEqual(repo.createProjectPatternFileId(), id);
  assert.throws(() => repo.buildProjectPatternStoragePath('u', '../p', id));
  await assert.rejects(repo.validateProjectPatternPath('other-project', pattern));
  assert.throws(() => repo.validateProjectPdfSize({ size: 0 }));
  assert.throws(() => repo.validateProjectPdfSize({ size: 5 * 1024 * 1024 + 1 }));
  await repo.uploadProjectPattern('p', pattern, { size: 10 });
  assert.deepEqual(clone(calls[0]), { key: old.storagePath, options: { contentType: 'application/pdf', upsert: false } });
  const bytes = await repo.downloadProjectPattern('p', pattern, new AbortController().signal);
  assert.equal(new TextDecoder().decode(bytes), '%PDF-test');
  assert.equal(fetchCount, 2); assert.equal(calls.filter(x => x === 'signed').length, 2);
});

test('Point read differentiates absence, unusable data, read errors and a usable Project', async () => {
  let reply;
  const { loadProject } = modules({ 'lib/supabase': { supabase: {
    auth: { async getUser() { return { data: { user: { id: 'u' } } }; } },
    from() { const q = { select() { return q; }, eq() { return q; }, async maybeSingle() { return reply; } }; return q; },
  } } })('lib/projectsRepository');
  reply = { data: { id: 'p', data: project() } };
  assert.equal((await loadProject('p')).status, 'found');
  reply = { data: null };
  assert.equal((await loadProject('p')).status, 'not_found');
  reply = { error: new Error('offline') };
  assert.equal((await loadProject('p')).status, 'read_error');
  for (const data of [null, { ...project(), id: 'wrong-id' }, { ...project(), pattern: { type: 'pdf', fileId: old.fileId } }, { ...project(), pattern: { ...old, storagePath: ` ${old.storagePath}` } }]) {
    reply = { data: { id: 'p', data } };
    assert.equal((await loadProject('p')).status, 'invalid');
  }
});

test('Download stops after one renewal and cancels oversized responses', async () => {
  let requests = 0, cancels = 0;
  let oversized = false;
  const repo = modules({ 'lib/supabase': { supabase: {
    auth: { async getUser() { return { data: { user: { id: 'u' } } }; } },
    storage: { from() { return { async createSignedUrl() { return { data: { signedUrl: 'https://example.invalid/local-check' } }; } }; } },
  } } }, {
    async fetch() {
      requests++;
      return { ok: oversized, status: oversized ? 200 : 403, headers: { get() { return String(6 * 1024 * 1024); } }, body: { async cancel() { cancels++; } } };
    },
  })('lib/projectPatternsRepository');
  await assert.rejects(repo.downloadProjectPattern('p', old, new AbortController().signal));
  assert.equal(requests, 2); assert.equal(cancels, 2);
  oversized = true;
  await assert.rejects(repo.downloadProjectPattern('p', old, new AbortController().signal));
  assert.equal(requests, 3); assert.equal(cancels, 3);
});
