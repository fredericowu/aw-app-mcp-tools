from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from mcp_tools_app.plugin import McpToolsAppPlugin, build_mcp_servers  # noqa: E402

CUSTOM = {"custom": {"type": "stdio", "command": "my-tool", "args": ["--custom"]}}
EMPTY = {"mcpServers": {}}


@pytest.fixture(autouse=True)
def isolated_home(tmp_path, monkeypatch):
    monkeypatch.setenv("AW_WORKSPACE_HOME", str(tmp_path / "home"))


def run(coro):
    return asyncio.run(coro)


def context(tmp_path, config, shipped=False, version="1.0.0"):
    package = tmp_path / "package"
    package.mkdir(exist_ok=True)
    (package / "aw-app.json").write_text(json.dumps({"version": version, "contributes": {}}))
    if shipped:
        (package / ".mcp-tools-initialized").unlink(missing_ok=True)
        (package / "mcp.json").write_text(json.dumps(EMPTY))
    return SimpleNamespace(package_dir=str(package), config=config,
                           routes=SimpleNamespace(register=lambda *a: None))


def read(ctx):
    return json.loads((Path(ctx.package_dir) / "mcp.json").read_text())


@pytest.mark.parametrize("config", [None, {}, {"mcpServers": None}, EMPTY])
def test_unconfigured_activation_has_no_upstreams(tmp_path, config):
    assert build_mcp_servers(config) == {}
    ctx = context(tmp_path, config)
    run(McpToolsAppPlugin().activate(ctx))
    assert read(ctx) == EMPTY


def test_shipped_defaults_are_empty_and_install_no_helpers():
    manifest = json.loads((ROOT / "aw-app.json").read_text())
    assert manifest["config_schema"]["properties"]["mcpServers"]["default"] == {}
    assert not manifest["contributes"].get("system_clis")
    assert json.loads((ROOT / "mcp.json").read_text()) == EMPTY


def test_explicit_custom_configuration_survives_lifecycle(tmp_path):
    ctx = context(tmp_path, {"mcpServers": CUSTOM})
    plugin = McpToolsAppPlugin()
    run(plugin.activate(ctx))
    assert read(ctx) == {"mcpServers": CUSTOM}
    run(plugin.deactivate())
    run(McpToolsAppPlugin().activate(ctx))
    assert read(ctx) == {"mcpServers": CUSTOM}


@pytest.mark.parametrize("manual", [EMPTY, {"mcpServers": CUSTOM}])
def test_manual_edit_survives_reactivation_and_package_upgrade(tmp_path, manual):
    ctx = context(tmp_path, {"mcpServers": {"old": {"command": "old"}}}, True)
    plugin = McpToolsAppPlugin()
    run(plugin.activate(ctx))
    path = Path(ctx.package_dir) / "mcp.json"
    body = json.dumps(manual) + "\n"
    path.write_text(body)
    before = path.stat().st_mtime_ns
    run(McpToolsAppPlugin().activate(ctx))
    assert path.read_text() == body
    assert path.stat().st_mtime_ns == before
    # A real update deactivates the plugin then replaces the package.
    run(plugin.deactivate())
    ctx = context(tmp_path, ctx.config, shipped=True, version="1.0.0")
    run(McpToolsAppPlugin().activate(ctx))
    assert read(ctx) == manual
    # Reinstall after the package is removed also restores durable state.
    path.unlink()
    run(McpToolsAppPlugin().activate(ctx))
    assert read(ctx) == manual


def test_existing_manual_custom_file_wins_on_first_activation(tmp_path):
    ctx = context(tmp_path, EMPTY)
    (Path(ctx.package_dir) / "mcp.json").write_text(json.dumps({"mcpServers": CUSTOM}))
    run(McpToolsAppPlugin().activate(ctx))
    assert read(ctx) == {"mcpServers": CUSTOM}


@pytest.mark.parametrize("saved", [EMPTY, {"mcpServers": CUSTOM}])
def test_settings_save_replaces_file_and_durable_state(tmp_path, saved):
    ctx = context(tmp_path, EMPTY, True)
    plugin = McpToolsAppPlugin()
    run(plugin.activate(ctx))
    ctx.config = saved
    run(plugin.on_config_saved(ctx))
    assert read(ctx) == saved
    ctx = context(tmp_path, {}, True, version="2.0.0")
    run(McpToolsAppPlugin().activate(ctx))
    assert read(ctx) == saved


@pytest.mark.parametrize("manual", [EMPTY, {"mcpServers": CUSTOM}])
def test_existing_manual_file_beats_stale_settings_on_first_activation(tmp_path, manual):
    ctx = context(tmp_path, {"mcpServers": {"old": {"command": "old"}}})
    path = Path(ctx.package_dir) / "mcp.json"
    body = json.dumps(manual, separators=(",", ":")) + "\n"
    path.write_text(body)
    before = path.stat().st_mtime_ns
    plugin = McpToolsAppPlugin()
    run(plugin.activate(ctx))
    assert path.read_text() == body
    assert path.stat().st_mtime_ns == before
    state = tmp_path / "home" / "data" / "mcp-tools" / "config-state.json"
    assert json.loads(state.read_text()) == manual
    # Saved settings become authoritative only on an explicit Settings save.
    run(plugin.on_config_saved(ctx))
    assert read(ctx) == ctx.config
