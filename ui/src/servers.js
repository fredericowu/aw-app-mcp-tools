// Pure helpers for the MCP Tools settings panel (no DOM, no host).
//
// One document -- {mcpServers: {name: spec}} -- backs both the Servers and the
// JSON views. Servers edits are merged OVER the original spec, so fields the
// form does not know (allowed_tools, cwd_app_dir, ...) survive an edit.

export const FORM_TYPES = ['stdio', 'http'];
const FORM_KEYS = ['type', 'enabled', 'command', 'args', 'env', 'cwd', 'url', 'headers'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Servers view edits stdio/http (or untyped) entries; gateway and unknown
// types are listed but edited in JSON only.
export function isFormEditable(spec) {
  const t = isObj(spec) ? spec.type : undefined;
  return isObj(spec) && (t === undefined || FORM_TYPES.includes(t));
}

export function serverType(spec) {
  if (!isObj(spec)) return 'invalid';
  return spec.type ?? (spec.url && !spec.command ? 'http' : 'stdio');
}

// Returns an error string, or null. Mirrors the manifest schema the core
// enforces with a 422, so the panel can refuse before sending.
export function validateDoc(doc) {
  if (!isObj(doc) || !isObj(doc.mcpServers)) return 'JSON must be an object with an "mcpServers" object.';
  for (const [name, spec] of Object.entries(doc.mcpServers)) {
    if (!name.trim()) return 'Server names cannot be empty.';
    if (!isObj(spec)) return `Server "${name}" must be an object.`;
    const t = spec.type;
    if (t !== undefined && !['stdio', 'http', 'gateway'].includes(t)) {
      return `Server "${name}": type must be stdio, http or gateway.`;
    }
    if (spec.enabled !== undefined && typeof spec.enabled !== 'boolean') {
      return `Server "${name}": enabled must be true or false.`;
    }
    if (t === 'stdio' && !(typeof spec.command === 'string' && spec.command)) {
      return `Server "${name}": stdio needs a command.`;
    }
    if ((t === 'http' || t === 'gateway') && !(typeof spec.url === 'string' && spec.url)) {
      return `Server "${name}": ${t} needs a url.`;
    }
    if (t === undefined && !spec.command && !spec.url) return `Server "${name}": needs a command or a url.`;
  }
  return null;
}

export function parseJsonDoc(text) {
  let doc;
  try { doc = JSON.parse(text); } catch (e) { return { error: `Invalid JSON: ${e.message}` }; }
  const error = validateDoc(doc);
  return error ? { error } : { doc };
}

export const pretty = (doc) => JSON.stringify(doc, null, 2);

const kvFrom = (o) => Object.entries(isObj(o) ? o : {}).map(([key, val]) => ({ key, val: String(val) }));
const kvTo = (items) => Object.fromEntries(
  items.filter((x) => x.key.trim()).map(({ key, val }) => [key.trim(), val]),
);

export const blankForm = () => ({
  name: '', type: 'stdio', enabled: true, command: '', args: '', env: [], cwd: '', url: '', headers: [],
});

export function specToForm(name, spec) {
  const type = FORM_TYPES.includes(spec.type) ? spec.type : serverType(spec);
  return {
    name,
    type: FORM_TYPES.includes(type) ? type : 'stdio',
    enabled: spec.enabled !== false,
    command: spec.command ?? '',
    args: Array.isArray(spec.args) ? spec.args.join('\n') : '',
    env: kvFrom(spec.env),
    cwd: spec.cwd ?? '',
    url: spec.url ?? '',
    headers: kvFrom(spec.headers),
  };
}

export function formError(form, existingNames, isNew) {
  const name = form.name.trim();
  if (!name) return 'Name is required.';
  if (isNew && existingNames.includes(name)) return `A server named "${name}" already exists.`;
  if (form.type === 'stdio' && !form.command.trim()) return 'Command is required.';
  if (form.type === 'http' && !form.url.trim()) return 'URL is required.';
  return null;
}

// Merge the form over the ORIGINAL spec: only the keys the form owns are
// rewritten; everything else is carried through untouched.
export function formToSpec(form, original = {}) {
  const spec = { ...original };
  for (const k of FORM_KEYS) delete spec[k];
  spec.type = form.type;
  spec.enabled = form.enabled;
  if (form.type === 'stdio') {
    spec.command = form.command.trim();
    const args = form.args.split('\n').map((a) => a.trim()).filter(Boolean);
    if (args.length) spec.args = args;
    const env = kvTo(form.env);
    if (Object.keys(env).length) spec.env = env;
    if (form.cwd.trim()) spec.cwd = form.cwd.trim();
  } else {
    spec.url = form.url.trim();
    const headers = kvTo(form.headers);
    if (Object.keys(headers).length) spec.headers = headers;
  }
  return spec;
}
