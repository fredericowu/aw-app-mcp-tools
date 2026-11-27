// Component-mode settings panel for MCP Tools: one document, two views.
//   Servers -- structured list/add/edit/toggle/delete (ported from the shell's
//              old General > MCP Servers tab, minus sse and the live-tools probe)
//   JSON    -- the whole {mcpServers} document as text
// Both load from GET /mcp.json (the effective file, manual edits included) and
// save the whole mcpServers object through core's POST /api/apps/mcp-tools/config
// (schema-validated, runs on_config_saved and the gateway reload). The document
// is reloaded after every save, so the two views never drift.
//
// Same host.h / host.React pattern as aw-app-feed-subscriber (see vite.config.js).
import {
  blankForm, formError, formToSpec, isFormEditable, parseJsonDoc, pretty, serverType, specToForm,
} from './servers.js';

export function register(host) {
  const { useState, useEffect, useCallback } = host.React;

  const inputCls = 'w-full bg-[var(--color-bg-primary)] text-xs text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 outline-none focus:border-[var(--color-accent)] font-mono';
  const btnCls = 'px-3 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40';

  async function loadDoc() {
    const r = await host.sdk.api.fetch(host.app.apiUrl('/mcp.json'));
    if (!r.ok) throw new Error(`Load failed (${r.status})`);
    const doc = await r.json();
    return { mcpServers: doc && typeof doc.mcpServers === 'object' && doc.mcpServers ? doc.mcpServers : {} };
  }

  async function saveDoc(doc) {
    const r = await host.sdk.api.fetch('/api/apps/mcp-tools/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { mcpServers: doc.mcpServers } }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.error) throw new Error(body.error || `Save failed (${r.status})`);
  }

  function KV({ label, items, onChange }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[var(--color-text-muted)]">{label}</span>
          <button type="button" className="text-[11px] text-[var(--color-accent)]"
            onClick={() => onChange([...items, { key: '', val: '' }])}>+ Add</button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="flex gap-1.5 mb-1">
            <input className={`${inputCls} w-32 shrink-0`} aria-label={`${label} key ${i + 1}`} value={it.key}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
            <input className={inputCls} aria-label={`${label} value ${i + 1}`} value={it.val}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, val: e.target.value } : x)))} />
            <button type="button" aria-label={`Remove ${label} ${i + 1}`} className="px-2 text-[var(--color-text-muted)]"
              onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
      </div>
    );
  }

  function Editor({ initial, isNew, names, onSave, onCancel, busy }) {
    const [form, setForm] = useState(initial);
    const err = formError(form, names, isNew);
    const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
    return (
      <div className="flex flex-col gap-3" data-testid="mcp-editor">
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">
          {isNew ? 'Add MCP server' : `Edit: ${form.name}`}
        </div>
        {isNew && (
          <label className="block"><span className="text-[11px] text-[var(--color-text-muted)]">Server name</span>
            <input className={inputCls} aria-label="Server name" value={form.name} onChange={set('name')} /></label>
        )}
        <div className="flex gap-2 items-center">
          {['stdio', 'http'].map((t) => (
            <button key={t} type="button" className={btnCls} aria-pressed={form.type === t}
              onClick={() => setForm((p) => ({ ...p, type: t }))}>{t}</button>
          ))}
          <label className="ml-auto flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
            <input type="checkbox" checked={form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))} /> Enabled
          </label>
        </div>
        {form.type === 'stdio' ? (
          <>
            <label className="block"><span className="text-[11px] text-[var(--color-text-muted)]">Command</span>
              <input className={inputCls} aria-label="Command" value={form.command} onChange={set('command')} /></label>
            <label className="block"><span className="text-[11px] text-[var(--color-text-muted)]">Arguments (one per line)</span>
              <textarea className={inputCls} rows={3} aria-label="Arguments" value={form.args} onChange={set('args')} /></label>
            <KV label="Environment" items={form.env} onChange={(env) => setForm((p) => ({ ...p, env }))} />
            <label className="block"><span className="text-[11px] text-[var(--color-text-muted)]">Working directory</span>
              <input className={inputCls} aria-label="Working directory" value={form.cwd} onChange={set('cwd')} /></label>
          </>
        ) : (
          <>
            <label className="block"><span className="text-[11px] text-[var(--color-text-muted)]">URL</span>
              <input className={inputCls} aria-label="URL" value={form.url} onChange={set('url')} /></label>
            <KV label="Headers" items={form.headers} onChange={(headers) => setForm((p) => ({ ...p, headers }))} />
          </>
        )}
        {err && <p className="text-[11px] text-[var(--color-danger)]">{err}</p>}
        <div className="flex gap-2">
          <button type="button" className={btnCls} disabled={!!err || busy} onClick={() => onSave(form)}>Save server</button>
          <button type="button" className={btnCls} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  function McpToolsSettings() {
    const [doc, setDoc] = useState(null);
    const [view, setView] = useState('servers');
    const [text, setText] = useState('');
    const [dirty, setDirty] = useState(false);
    const [editing, setEditing] = useState(null); // {name|null, form}
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);

    const reload = useCallback(async () => {
      const next = await loadDoc();
      setDoc(next);
      setText(pretty(next));
      setDirty(false);
      return next;
    }, []);

    useEffect(() => { reload().catch((e) => setMsg({ ok: false, text: String(e.message || e) })); }, [reload]);

    // Persist a whole new document, then re-read the effective file.
    const persist = useCallback(async (next, okText = 'Saved') => {
      setBusy(true);
      setMsg(null);
      try {
        await saveDoc(next);
        await reload();
        setMsg({ ok: true, text: okText });
        return true;
      } catch (e) {
        setMsg({ ok: false, text: String(e.message || e) });
        return false;
      } finally {
        setBusy(false);
      }
    }, [reload]);

    const switchView = (v) => {
      if (v === view) return;
      if (view === 'json' && dirty) {
        setMsg({ ok: false, text: 'Unsaved JSON changes: save or discard them before switching.' });
        return;
      }
      setMsg(null);
      setEditing(null);
      setView(v);
    };

    if (!doc) return <div className="p-4 text-xs text-[var(--color-text-muted)]">{msg ? msg.text : 'Loading...'}</div>;

    const servers = doc.mcpServers;
    const names = Object.keys(servers);

    const toggle = (name) => persist({
      mcpServers: { ...servers, [name]: { ...servers[name], enabled: servers[name].enabled === false } },
    });
    const remove = (name) => {
      const { [name]: _gone, ...rest } = servers;
      return persist({ mcpServers: rest }, `Deleted ${name}`);
    };
    const saveServer = async (form) => {
      const name = editing.name ?? form.name.trim();
      const ok = await persist({ mcpServers: { ...servers, [name]: formToSpec(form, servers[name] || {}) } });
      if (ok) setEditing(null);
    };
    const saveJson = async () => {
      const parsed = parseJsonDoc(text);
      if (parsed.error) { setMsg({ ok: false, text: parsed.error }); return; }
      await persist(parsed.doc);
    };

    return (
      <div className="flex flex-col gap-3" data-testid="mcp-tools-panel">
        <div className="flex gap-2" role="tablist">
          {[['servers', 'Servers'], ['json', 'JSON']].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} className={btnCls}
              onClick={() => switchView(k)}>{label}</button>
          ))}
          {msg && <span role="status" className={`ml-auto text-xs ${msg.ok ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-danger)]'}`}>{msg.text}</span>}
        </div>

        {view === 'json' ? (
          <div className="flex flex-col gap-2">
            <textarea className={inputCls} rows={16} spellCheck={false} aria-label="MCP servers JSON" value={text}
              onChange={(e) => { setText(e.target.value); setDirty(true); }} />
            <div className="flex gap-2">
              <button type="button" className={btnCls} disabled={busy || !dirty} onClick={saveJson}>Save JSON</button>
              <button type="button" className={btnCls} disabled={!dirty}
                onClick={() => { setText(pretty(doc)); setDirty(false); setMsg(null); }}>Discard</button>
            </div>
          </div>
        ) : editing ? (
          <Editor initial={editing.form} isNew={editing.name === null} names={names} busy={busy}
            onSave={saveServer} onCancel={() => setEditing(null)} />
        ) : (
          <div className="flex flex-col gap-1">
            {names.length === 0 && <p className="text-xs italic text-[var(--color-text-muted)]">No MCP servers configured.</p>}
            {names.map((name) => {
              const spec = servers[name];
              const editable = isFormEditable(spec);
              return (
                <div key={name} data-testid={`mcp-row-${name}`} className="flex items-center gap-2 border border-[var(--color-border)] rounded px-2 py-1.5">
                  <input type="checkbox" aria-label={`Enable ${name}`} checked={spec?.enabled !== false} disabled={busy || typeof spec !== 'object' || spec === null}
                    onChange={() => toggle(name)} />
                  <span className="font-mono text-xs text-[var(--color-text-primary)]">{name}</span>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{serverType(spec)}</span>
                  <span className="flex-1 truncate text-[11px] font-mono text-[var(--color-text-muted)]">
                    {spec?.url || [spec?.command, ...(spec?.args || [])].filter(Boolean).join(' ')}
                  </span>
                  <button type="button" className={btnCls} disabled={!editable || busy}
                    title={editable ? undefined : 'This entry type is edited in the JSON view'}
                    onClick={() => setEditing({ name, form: specToForm(name, spec) })}>Edit</button>
                  <button type="button" className={btnCls} disabled={busy} onClick={() => remove(name)}>Delete</button>
                </div>
              );
            })}
            <div><button type="button" className={btnCls} onClick={() => setEditing({ name: null, form: blankForm() })}>+ Add server</button></div>
          </div>
        )}
      </div>
    );
  }

  host.registerWindow('mcp-tools.settings', McpToolsSettings);
}

export default register;
