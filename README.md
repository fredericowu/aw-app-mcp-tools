# MCP Tools

MCP Tools is a blank, configurable placeholder for workspace MCP upstreams.
It ships `{"mcpServers": {}}` and installs no browser or helper CLI.

Open the workspace Settings to add explicit server definitions. Saving applies
that exact configuration, including an empty object, and reloads the gateway.

Activation preserves existing configuration files. Manual edits are captured on
activation and deactivation. A durable copy under
`AW_WORKSPACE_HOME/data/mcp-tools/config-state.json` restores configuration after
package updates or reinstalls. Settings saves deliberately replace that copy.
The gateway reads a regular `mcp.json` in the installed package directory.
