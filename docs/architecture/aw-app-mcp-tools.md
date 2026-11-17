# MCP Tools

MCP Tools is an in-process app with a configuration editor and status routes.
It ships an empty `mcpServers` object; there are no default upstreams, Browser
dependency, or automatic helper installations.

`build_mcp_servers` passes explicit definitions through unchanged. Missing,
null, or empty configuration yields no upstreams. `on_config_saved` writes
Settings changes before the gateway reload requested by `reload_on_save`.

Activation preserves manual file edits. Configuration is mirrored to durable
workspace data on activation, Settings save, and deactivation. A package upgrade
that replaces the gateway file with the shipped placeholder restores that copy.
A regular file is required because the gateway does not mount workspace data.

Regression coverage lives in `tests/test_plugin.py` and `tests/test_routes.py`.
