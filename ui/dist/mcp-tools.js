const $ = ["stdio", "http"], V = ["type", "enabled", "command", "args", "env", "cwd", "url", "headers"], S = (e) => e !== null && typeof e == "object" && !Array.isArray(e);
function W(e) {
  const t = S(e) ? e.type : void 0;
  return S(e) && (t === void 0 || $.includes(t));
}
function D(e) {
  return S(e) ? e.type ?? (e.url && !e.command ? "http" : "stdio") : "invalid";
}
function K(e) {
  if (!S(e) || !S(e.mcpServers)) return 'JSON must be an object with an "mcpServers" object.';
  for (const [t, r] of Object.entries(e.mcpServers)) {
    if (!t.trim()) return "Server names cannot be empty.";
    if (!S(r)) return `Server "${t}" must be an object.`;
    const s = r.type;
    if (s !== void 0 && !["stdio", "http", "gateway"].includes(s))
      return `Server "${t}": type must be stdio, http or gateway.`;
    if (r.enabled !== void 0 && typeof r.enabled != "boolean")
      return `Server "${t}": enabled must be true or false.`;
    if (s === "stdio" && !(typeof r.command == "string" && r.command))
      return `Server "${t}": stdio needs a command.`;
    if ((s === "http" || s === "gateway") && !(typeof r.url == "string" && r.url))
      return `Server "${t}": ${s} needs a url.`;
    if (s === void 0 && !r.command && !r.url) return `Server "${t}": needs a command or a url.`;
  }
  return null;
}
function Y(e) {
  let t;
  try {
    t = JSON.parse(e);
  } catch (s) {
    return { error: `Invalid JSON: ${s.message}` };
  }
  const r = K(t);
  return r ? { error: r } : { doc: t };
}
const J = (e) => JSON.stringify(e, null, 2), A = (e) => Object.entries(S(e) ? e : {}).map(([t, r]) => ({ key: t, val: String(r) })), T = (e) => Object.fromEntries(
  e.filter((t) => t.key.trim()).map(({ key: t, val: r }) => [t.trim(), r])
), H = () => ({
  name: "",
  type: "stdio",
  enabled: !0,
  command: "",
  args: "",
  env: [],
  cwd: "",
  url: "",
  headers: []
});
function I(e, t) {
  const r = $.includes(t.type) ? t.type : D(t);
  return {
    name: e,
    type: $.includes(r) ? r : "stdio",
    enabled: t.enabled !== !1,
    command: t.command ?? "",
    args: Array.isArray(t.args) ? t.args.join(`
`) : "",
    env: A(t.env),
    cwd: t.cwd ?? "",
    url: t.url ?? "",
    headers: A(t.headers)
  };
}
function z(e, t, r) {
  const s = e.name.trim();
  return s ? r && t.includes(s) ? `A server named "${s}" already exists.` : e.type === "stdio" && !e.command.trim() ? "Command is required." : e.type === "http" && !e.url.trim() ? "URL is required." : null : "Name is required.";
}
function G(e, t = {}) {
  const r = { ...t };
  for (const s of V) delete r[s];
  if (r.type = e.type, r.enabled = e.enabled, e.type === "stdio") {
    r.command = e.command.trim();
    const s = e.args.split(`
`).map((b) => b.trim()).filter(Boolean);
    s.length && (r.args = s);
    const v = T(e.env);
    Object.keys(v).length && (r.env = v), e.cwd.trim() && (r.cwd = e.cwd.trim());
  } else {
    r.url = e.url.trim();
    const s = T(e.headers);
    Object.keys(s).length && (r.headers = s);
  }
  return r;
}
function Q(e) {
  const { useState: t, useEffect: r, useCallback: s } = e.React, v = "w-full bg-[var(--color-bg-primary)] text-xs text-[var(--color-text-primary)] border border-[var(--color-border)] rounded px-2 py-1.5 outline-none focus:border-[var(--color-accent)] font-mono", b = "px-3 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40";
  async function F() {
    const d = await e.sdk.api.fetch(e.app.apiUrl("/mcp.json"));
    if (!d.ok) throw new Error(`Load failed (${d.status})`);
    const o = await d.json();
    return { mcpServers: o && typeof o.mcpServers == "object" && o.mcpServers ? o.mcpServers : {} };
  }
  async function R(d) {
    const o = await e.sdk.api.fetch("/api/apps/mcp-tools/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: { mcpServers: d.mcpServers } })
    }), u = await o.json().catch(() => ({}));
    if (!o.ok || u.error) throw new Error(u.error || `Save failed (${o.status})`);
  }
  function O({ label: d, items: o, onChange: u }) {
    return /* @__PURE__ */ e.h("div", null, /* @__PURE__ */ e.h("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ e.h("span", { className: "text-[11px] text-[var(--color-text-muted)]" }, d), /* @__PURE__ */ e.h(
      "button",
      {
        type: "button",
        className: "text-[11px] text-[var(--color-accent)]",
        onClick: () => u([...o, { key: "", val: "" }])
      },
      "+ Add"
    )), o.map((h, p) => /* @__PURE__ */ e.h("div", { key: p, className: "flex gap-1.5 mb-1" }, /* @__PURE__ */ e.h(
      "input",
      {
        className: `${v} w-32 shrink-0`,
        "aria-label": `${d} key ${p + 1}`,
        value: h.key,
        onChange: (f) => u(o.map((n, m) => m === p ? { ...n, key: f.target.value } : n))
      }
    ), /* @__PURE__ */ e.h(
      "input",
      {
        className: v,
        "aria-label": `${d} value ${p + 1}`,
        value: h.val,
        onChange: (f) => u(o.map((n, m) => m === p ? { ...n, val: f.target.value } : n))
      }
    ), /* @__PURE__ */ e.h(
      "button",
      {
        type: "button",
        "aria-label": `Remove ${d} ${p + 1}`,
        className: "px-2 text-[var(--color-text-muted)]",
        onClick: () => u(o.filter((f, n) => n !== p))
      },
      "×"
    ))));
  }
  function M({ initial: d, isNew: o, names: u, onSave: h, onCancel: p, busy: f }) {
    const [n, m] = t(d), y = z(n, u, o), x = (c) => (i) => m((k) => ({ ...k, [c]: i.target.value }));
    return /* @__PURE__ */ e.h("div", { className: "flex flex-col gap-3", "data-testid": "mcp-editor" }, /* @__PURE__ */ e.h("div", { className: "text-sm font-semibold text-[var(--color-text-primary)]" }, o ? "Add MCP server" : `Edit: ${n.name}`), o && /* @__PURE__ */ e.h("label", { className: "block" }, /* @__PURE__ */ e.h("span", { className: "text-[11px] text-[var(--color-text-muted)]" }, "Server name"), /* @__PURE__ */ e.h("input", { className: v, "aria-label": "Server name", value: n.name, onChange: x("name") })), /* @__PURE__ */ e.h("div", { className: "flex gap-2 items-center" }, ["stdio", "http"].map((c) => /* @__PURE__ */ e.h(
      "button",
      {
        key: c,
        type: "button",
        className: b,
        "aria-pressed": n.type === c,
        onClick: () => m((i) => ({ ...i, type: c }))
      },
      c
    )), /* @__PURE__ */ e.h("label", { className: "ml-auto flex items-center gap-1 text-xs text-[var(--color-text-muted)]" }, /* @__PURE__ */ e.h(
      "input",
      {
        type: "checkbox",
        checked: n.enabled,
        onChange: (c) => m((i) => ({ ...i, enabled: c.target.checked }))
      }
    ), " Enabled")), n.type === "stdio" ? /* @__PURE__ */ e.h(e.React.Fragment, null, /* @__PURE__ */ e.h("label", { className: "block" }, /* @__PURE__ */ e.h("span", { className: "text-[11px] text-[var(--color-text-muted)]" }, "Command"), /* @__PURE__ */ e.h("input", { className: v, "aria-label": "Command", value: n.command, onChange: x("command") })), /* @__PURE__ */ e.h("label", { className: "block" }, /* @__PURE__ */ e.h("span", { className: "text-[11px] text-[var(--color-text-muted)]" }, "Arguments (one per line)"), /* @__PURE__ */ e.h("textarea", { className: v, rows: 3, "aria-label": "Arguments", value: n.args, onChange: x("args") })), /* @__PURE__ */ e.h(O, { label: "Environment", items: n.env, onChange: (c) => m((i) => ({ ...i, env: c })) }), /* @__PURE__ */ e.h("label", { className: "block" }, /* @__PURE__ */ e.h("span", { className: "text-[11px] text-[var(--color-text-muted)]" }, "Working directory"), /* @__PURE__ */ e.h("input", { className: v, "aria-label": "Working directory", value: n.cwd, onChange: x("cwd") }))) : /* @__PURE__ */ e.h(e.React.Fragment, null, /* @__PURE__ */ e.h("label", { className: "block" }, /* @__PURE__ */ e.h("span", { className: "text-[11px] text-[var(--color-text-muted)]" }, "URL"), /* @__PURE__ */ e.h("input", { className: v, "aria-label": "URL", value: n.url, onChange: x("url") })), /* @__PURE__ */ e.h(O, { label: "Headers", items: n.headers, onChange: (c) => m((i) => ({ ...i, headers: c })) })), y && /* @__PURE__ */ e.h("p", { className: "text-[11px] text-[var(--color-danger)]" }, y), /* @__PURE__ */ e.h("div", { className: "flex gap-2" }, /* @__PURE__ */ e.h("button", { type: "button", className: b, disabled: !!y || f, onClick: () => h(n) }, "Save server"), /* @__PURE__ */ e.h("button", { type: "button", className: b, onClick: p }, "Cancel")));
  }
  function L() {
    const [d, o] = t(null), [u, h] = t("servers"), [p, f] = t(""), [n, m] = t(!1), [y, x] = t(null), [c, i] = t(null), [k, E] = t(!1), w = s(async () => {
      const a = await F();
      return o(a), f(J(a)), m(!1), a;
    }, []);
    r(() => {
      w().catch((a) => i({ ok: !1, text: String(a.message || a) }));
    }, [w]);
    const C = s(async (a, l = "Saved") => {
      E(!0), i(null);
      try {
        return await R(a), await w(), i({ ok: !0, text: l }), !0;
      } catch (N) {
        return i({ ok: !1, text: String(N.message || N) }), !1;
      } finally {
        E(!1);
      }
    }, [w]), P = (a) => {
      if (a !== u) {
        if (u === "json" && n) {
          i({ ok: !1, text: "Unsaved JSON changes: save or discard them before switching." });
          return;
        }
        i(null), x(null), h(a);
      }
    };
    if (!d) return /* @__PURE__ */ e.h("div", { className: "p-4 text-xs text-[var(--color-text-muted)]" }, c ? c.text : "Loading...");
    const g = d.mcpServers, j = Object.keys(g), U = (a) => C({
      mcpServers: { ...g, [a]: { ...g[a], enabled: g[a].enabled === !1 } }
    }), _ = (a) => {
      const { [a]: l, ...N } = g;
      return C({ mcpServers: N }, `Deleted ${a}`);
    }, q = async (a) => {
      const l = y.name ?? a.name.trim();
      await C({ mcpServers: { ...g, [l]: G(a, g[l] || {}) } }) && x(null);
    }, B = async () => {
      const a = Y(p);
      if (a.error) {
        i({ ok: !1, text: a.error });
        return;
      }
      await C(a.doc);
    };
    return /* @__PURE__ */ e.h("div", { className: "flex flex-col gap-3", "data-testid": "mcp-tools-panel" }, /* @__PURE__ */ e.h("div", { className: "flex gap-2", role: "tablist" }, [["servers", "Servers"], ["json", "JSON"]].map(([a, l]) => /* @__PURE__ */ e.h(
      "button",
      {
        key: a,
        type: "button",
        role: "tab",
        "aria-selected": u === a,
        className: b,
        onClick: () => P(a)
      },
      l
    )), c && /* @__PURE__ */ e.h("span", { role: "status", className: `ml-auto text-xs ${c.ok ? "text-[var(--color-text-muted)]" : "text-[var(--color-danger)]"}` }, c.text)), u === "json" ? /* @__PURE__ */ e.h("div", { className: "flex flex-col gap-2" }, /* @__PURE__ */ e.h(
      "textarea",
      {
        className: v,
        rows: 16,
        spellCheck: !1,
        "aria-label": "MCP servers JSON",
        value: p,
        onChange: (a) => {
          f(a.target.value), m(!0);
        }
      }
    ), /* @__PURE__ */ e.h("div", { className: "flex gap-2" }, /* @__PURE__ */ e.h("button", { type: "button", className: b, disabled: k || !n, onClick: B }, "Save JSON"), /* @__PURE__ */ e.h(
      "button",
      {
        type: "button",
        className: b,
        disabled: !n,
        onClick: () => {
          f(J(d)), m(!1), i(null);
        }
      },
      "Discard"
    ))) : y ? /* @__PURE__ */ e.h(
      M,
      {
        initial: y.form,
        isNew: y.name === null,
        names: j,
        busy: k,
        onSave: q,
        onCancel: () => x(null)
      }
    ) : /* @__PURE__ */ e.h("div", { className: "flex flex-col gap-1" }, j.length === 0 && /* @__PURE__ */ e.h("p", { className: "text-xs italic text-[var(--color-text-muted)]" }, "No MCP servers configured."), j.map((a) => {
      const l = g[a], N = W(l);
      return /* @__PURE__ */ e.h("div", { key: a, "data-testid": `mcp-row-${a}`, className: "flex items-center gap-2 border border-[var(--color-border)] rounded px-2 py-1.5" }, /* @__PURE__ */ e.h(
        "input",
        {
          type: "checkbox",
          "aria-label": `Enable ${a}`,
          checked: (l == null ? void 0 : l.enabled) !== !1,
          disabled: k || typeof l != "object" || l === null,
          onChange: () => U(a)
        }
      ), /* @__PURE__ */ e.h("span", { className: "font-mono text-xs text-[var(--color-text-primary)]" }, a), /* @__PURE__ */ e.h("span", { className: "text-[10px] font-mono text-[var(--color-text-muted)]" }, D(l)), /* @__PURE__ */ e.h("span", { className: "flex-1 truncate text-[11px] font-mono text-[var(--color-text-muted)]" }, (l == null ? void 0 : l.url) || [l == null ? void 0 : l.command, ...(l == null ? void 0 : l.args) || []].filter(Boolean).join(" ")), /* @__PURE__ */ e.h(
        "button",
        {
          type: "button",
          className: b,
          disabled: !N || k,
          title: N ? void 0 : "This entry type is edited in the JSON view",
          onClick: () => x({ name: a, form: I(a, l) })
        },
        "Edit"
      ), /* @__PURE__ */ e.h("button", { type: "button", className: b, disabled: k, onClick: () => _(a) }, "Delete"));
    }), /* @__PURE__ */ e.h("div", null, /* @__PURE__ */ e.h("button", { type: "button", className: b, onClick: () => x({ name: null, form: H() }) }, "+ Add server"))));
  }
  e.registerWindow("mcp-tools.settings", L);
}
export {
  Q as default,
  Q as register
};
