from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from . import routes as routes_mod

log = logging.getLogger("aw_apps.mcp_tools")


def build_mcp_servers(config: dict) -> dict:
    """Return explicit server definitions, with no built-in upstreams."""
    servers = (config or {}).get("mcpServers")
    return dict(servers) if isinstance(servers, dict) else {}


def _write_document(path: Path, doc: dict) -> None:
    body = json.dumps(doc, indent=2) + "\n"
    if not path.exists() or path.read_text(encoding="utf-8") != body:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")


def write_mcp_json(package_dir: str, config: dict) -> dict:
    """Apply an explicit Settings save to the gateway's regular file."""
    doc = {"mcpServers": build_mcp_servers(config)}
    _write_document(Path(package_dir) / "mcp.json", doc)
    return doc


def _state_path() -> Path:
    home = Path(os.environ.get("AW_WORKSPACE_HOME") or
                str(Path(os.environ.get("AW_WORKSPACE_CONTAINER_DIR", "/opt/aw-workspace")) /
                    ".aw-workspace"))
    return home / "data" / "mcp-tools" / "config-state.json"


def _remember(package_dir: str) -> dict:
    path = Path(package_dir) / "mcp.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    _write_document(_state_path(), doc)
    return doc


class McpToolsAppPlugin:
    async def activate(self, ctx) -> None:
        self._package_dir = ctx.package_dir
        path = Path(ctx.package_dir) / "mcp.json"
        marker = Path(ctx.package_dir) / ".mcp-tools-initialized"
        state_path = _state_path()
        state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else None
        current = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
        empty = {"mcpServers": {}}

        # Updates replace the package with the shipped empty file. Restore
        # durable configuration then; on ordinary activation the existing file
        # wins, including a manual edit that explicitly removed every server.
        if state and (current is None or
                      (not marker.exists() and current == empty)):
            _write_document(path, state)
        elif current is None:
            write_mcp_json(ctx.package_dir, getattr(ctx, "config", {}) or {})

        # With no durable state, an existing empty file can be a manual edit.
        # Saved Settings are applied only to a missing file or on explicit save.
        doc = _remember(ctx.package_dir)
        marker.touch(exist_ok=True)
        ctx.routes.register(routes_mod.build_routes())
        log.info("mcp-tools activated: mcp.json servers=%s", list(doc.get("mcpServers", {})))

    async def on_config_saved(self, ctx) -> None:
        """An explicit Settings save replaces the file, including empty config."""
        write_mcp_json(ctx.package_dir, getattr(ctx, "config", {}) or {})
        _remember(ctx.package_dir)

    async def deactivate(self) -> None:
        # Capture manual file edits before the package is replaced on update.
        _remember(self._package_dir)
        log.info("mcp-tools deactivated")
