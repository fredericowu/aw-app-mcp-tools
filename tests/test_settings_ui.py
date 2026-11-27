"""Manifest + bundle checks for the MCP Tools settings panel (card 4255bf3b)."""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest
from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / "aw-app.json").read_text())
SCHEMA = MANIFEST["config_schema"]
V = Draft7Validator(SCHEMA)


def ok(servers):
    return V.is_valid({"mcpServers": servers})


def test_settings_window_declared_and_slotted():
    c = MANIFEST["contributes"]
    assert {"id": "mcp-tools.settings", "title": "MCP Tools", "body": {"type": "component"}} in c["windows"]
    assert c["settings_panels"] == [{"id": "mcp-tools.settings", "window": "mcp-tools.settings"}]
    assert "core.window.body:mcp-tools.settings" in c["frontend"]["slots"]


def test_built_bundle_registers_the_settings_window_id():
    bundle = (ROOT / MANIFEST["contributes"]["frontend"]["bundle"]).read_text()
    assert "registerWindow" in bundle and "mcp-tools.settings" in bundle


@pytest.mark.parametrize("servers", [
    {},
    {"a": {"type": "stdio", "command": "x", "args": ["1"], "env": {"K": "v"}, "enabled": False}},
    {"a": {"type": "http", "url": "http://h", "headers": {"A": "b"}}},
    {"a": {"type": "gateway", "url": "http://h"}},
    {"a": {"command": "x"}},
    {"a": {"type": "stdio", "command": "x", "allowed_tools": ["t"], "cwd_app_dir": "d"}},
])
def test_valid_definitions_accepted(servers):
    assert ok(servers)


@pytest.mark.parametrize("servers", [
    {"a": "not-an-object"},
    {"a": ["list"]},
    {"a": {"type": "stdio"}},
    {"a": {"type": "http"}},
    {"a": {"type": "gateway"}},
    {"a": {"type": "sse", "url": "http://h"}},
    {"a": {}},
    {"a": {"command": "x", "args": "notalist"}},
    {"a": {"command": "x", "enabled": "yes"}},
])
def test_invalid_definitions_rejected(servers):
    assert not ok(servers)


def test_node_helper_tests():
    node = shutil.which("node")
    if not node:
        pytest.skip("node not installed")
    r = subprocess.run([node, "--test", str(ROOT / "ui" / "test" / "servers.test.mjs")], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
